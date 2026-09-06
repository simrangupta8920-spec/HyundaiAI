from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.database import get_db
from app.models.session import ConversationSession
from app.models.message import Message
from app.schemas.conversation import SessionStart, SessionResponse, ChatRequest, ChatResponse
from app.services.conversation_engine import process_message

from app.models.lead import Lead
from app.models.escalation import Escalation
from app.schemas.score import ScoreResponse
from app.schemas.lead import LeadResponse
from app.schemas.escalation import EscalationResponse
from app.services.conversation_engine import process_message, load_customer_state
from app.services.scoring_service import compute_score
from app.services.escalation_service import evaluate_escalation

router = APIRouter(prefix="/conversation", tags=["conversation"])


@router.post("/start", response_model=SessionResponse)
def start_session(req: SessionStart, db: Session = Depends(get_db)):
    session_id = str(uuid.uuid4())
    db_session = ConversationSession(
        id=session_id,
        showroom_id=req.showroom_id,
        customer_name=req.customer_name,
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


@router.post("/message", response_model=ChatResponse)
def send_message(req: ChatRequest, db: Session = Depends(get_db)):
    result = process_message(
        session_id=req.session_id,
        user_message=req.message,
        db=db,
    )
    return ChatResponse(
        session_id=req.session_id,
        reply=result.reply,
        recommended_car_ids=result.recommended_vehicle_ids,
        should_escalate=result.should_escalate,
        should_collect_lead=result.should_collect_lead,
        customer_state=result.customer_state,
    )


@router.get("/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    db_session = db.query(ConversationSession).filter(ConversationSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = db.query(Message).filter(Message.session_id == session_id).order_by(Message.timestamp).all()
    customer_state = load_customer_state(db_session)
    lead = db.query(Lead).filter(Lead.session_id == session_id).first()
    escalation = db.query(Escalation).filter(Escalation.session_id == session_id).first()
    return {
        "session": db_session,
        "customer_profile": customer_state,
        "messages": messages,
        "lead": lead,
        "escalation": escalation,
    }


@router.post("/{session_id}/end")
def end_session(session_id: str, db: Session = Depends(get_db)):
    db_session = db.query(ConversationSession).filter(ConversationSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    customer_state = load_customer_state(db_session)
    messages = db.query(Message).filter(Message.session_id == session_id).order_by(Message.timestamp).all()
    msg_dicts = [{"role": m.role, "content": m.content} for m in messages]

    # 1. Compute lead score & classification
    score_record = compute_score(session_id, db)

    # 2. Build AI conversation summary
    parts = []
    cust_name = db_session.customer_name or customer_state.customer_name
    if cust_name:
        parts.append(f"Customer: {cust_name}")
    if customer_state.preferred_model:
        parts.append(f"Interested in {customer_state.preferred_model}")
    if customer_state.budget_max:
        parts.append(f"Budget up to ₹{customer_state.budget_max}L")
    if customer_state.fuel:
        parts.append(f"Fuel: {customer_state.fuel}")
    if customer_state.purchase_timeline:
        parts.append(f"Timeline: {customer_state.purchase_timeline}")
    if customer_state.test_drive_interest:
        parts.append("Requested test drive")
    if customer_state.finance_interest:
        parts.append("Interested in finance/EMI")

    summary = ". ".join(parts) if parts else "Customer inquired about Hyundai vehicles."
    summary += f" Lead Score: {score_record.overall_score:.0f}/100 ({score_record.classification})."

    # 3. Check for escalation
    should_esc, esc_reason, esc_priority = evaluate_escalation(msg_dicts, customer_state)
    escalation_record = None

    if should_esc or customer_state.escalation_requested:
        reason = esc_reason or "Customer requested human assistance"
        db_session.status = "escalated"
        escalation_record = db.query(Escalation).filter(Escalation.session_id == session_id).first()
        if not escalation_record:
            escalation_record = Escalation(
                session_id=session_id,
                showroom_id=db_session.showroom_id or "HYD-DEL-001",
                reason=reason,
                priority=esc_priority or "high",
                status="pending",
            )
            db.add(escalation_record)
    else:
        db_session.status = "ended"

    db_session.ended_at = datetime.utcnow()

    # 4. Create or update Lead record
    lead_record = db.query(Lead).filter(Lead.session_id == session_id).first()
    cust_phone = getattr(customer_state, 'phone', None) or "+91-9876543210"
    cust_email = getattr(customer_state, 'email', None)
    if not lead_record:
        lead_record = Lead(
            session_id=session_id,
            showroom_id=db_session.showroom_id or "HYD-DEL-001",
            name=db_session.customer_name or customer_state.customer_name or "Showroom Customer",
            phone=cust_phone,
            email=cust_email,
            budget_min=customer_state.budget_min,
            budget_max=customer_state.budget_max,
            fuel_preference=customer_state.fuel,
            body_type_preference=customer_state.car_type,
            use_case=customer_state.usage,
            interested_car_ids=[],
            status=score_record.classification.lower() if score_record.classification else "new",
            notes=summary,
        )
        db.add(lead_record)
    else:
        lead_record.status = score_record.classification.lower() if score_record.classification else lead_record.status
        lead_record.notes = summary
        if customer_state.customer_name:
            lead_record.name = customer_state.customer_name
        if customer_state.phone:
            lead_record.phone = customer_state.phone

    db.commit()
    db.refresh(db_session)
    if lead_record:
        db.refresh(lead_record)
    if escalation_record:
        db.refresh(escalation_record)

    return {
        "session": SessionResponse.model_validate(db_session),
        "customer_profile": customer_state,
        "summary": summary,
        "score": ScoreResponse.model_validate(score_record),
        "lead": LeadResponse.model_validate(lead_record) if lead_record else None,
        "escalation": EscalationResponse.model_validate(escalation_record) if escalation_record else None,
        "transcript": messages,
    }
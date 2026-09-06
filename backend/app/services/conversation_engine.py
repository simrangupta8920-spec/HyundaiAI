"""
conversation_engine.py
Central orchestrator for every conversation turn.

Responsibilities:
1. Load CustomerState from the session
2. Build grounded system context (vehicle catalogue + customer summary)
3. Call the LLM provider
4. Persist the updated CustomerState
5. Return the ChatResult
"""
from __future__ import annotations

import json
from typing import List, Dict, Optional

from sqlalchemy.orm import Session as DBSession

from app.models.session import ConversationSession
from app.models.message import Message
from app.schemas.customer_state import CustomerState, ChatResult
from app.services.llm.provider_factory import get_llm_provider
from app.services.vehicle_service import recommend_vehicles, search_vehicles


# ---------------------------------------------------------------------------
# Vehicle context builder
# ---------------------------------------------------------------------------

def build_vehicle_context(state: CustomerState, max_vehicles: int = 8) -> str:
    """
    Build a compact markdown table of relevant Hyundai vehicles for the system prompt.
    Delegates to excel_loader.build_llm_vehicle_context() which reads live Excel data.
    Falls back to vehicle_service.search_vehicles if excel_loader is unavailable.
    """
    try:
        from app.services.excel_loader import build_llm_vehicle_context
        return build_llm_vehicle_context(brand="Hyundai", customer_state=state)
    except Exception:
        pass

    # Fallback: direct vehicle_service query
    budget = state.get_budget_midpoint()
    location = state.state or "Delhi"

    results = search_vehicles(
        brand="Hyundai",
        budget=budget,
        car_type=state.car_type,
        fuel_type=state.fuel,
        seating_capacity=state.family_size,
        state=location,
    )
    if not results:
        results = search_vehicles(brand="Hyundai", state=location)

    seen_models: set = set()
    deduped = []
    for v in results:
        if v["model"] not in seen_models:
            seen_models.add(v["model"])
            deduped.append(v)
        if len(deduped) >= max_vehicles:
            break

    if not deduped:
        return "Vehicle data not available."

    lines = ["| Brand | Model | Type | Fuel | Seats | On-Road (L) | Rating |"]
    lines.append("|---|---|---|---|---|---|---|")
    for v in deduped:
        lines.append(
            f"| {v.get('brand','')} | {v.get('model','')} | {v.get('car_type','')} | "
            f"{v.get('fuel_type','')} | {v.get('seating_capacity','')} | "
            f"₹{v.get('on_road_price','')} | {v.get('rating','')}/5 |"
        )
    return "\n".join(lines)


def build_customer_context_summary(state: CustomerState) -> str:
    """Build a human-readable summary of what we know about the customer."""
    if state.known_fields_count() == 0 and not state.customer_name:
        return "No information collected yet — this is the first interaction."

    parts = []
    if state.customer_name:
        parts.append(f"Name: {state.customer_name}")
    if state.budget_min and state.budget_max:
        parts.append(f"Budget: ₹{state.budget_min}–{state.budget_max} Lakhs")
    elif state.budget_max:
        parts.append(f"Budget: up to ₹{state.budget_max} Lakhs")
    elif state.budget_min:
        parts.append(f"Budget: from ₹{state.budget_min} Lakhs")
    if state.car_type:
        parts.append(f"Vehicle type: {state.car_type}")
    if state.preferred_model:
        parts.append(f"Preferred model: {state.preferred_model}")
    if state.fuel:
        parts.append(f"Fuel: {state.fuel}")
    if state.transmission:
        parts.append(f"Transmission: {state.transmission}")
    if state.family_size:
        parts.append(f"Family size: {state.family_size} people")
    if state.usage:
        parts.append(f"Usage: {state.usage}")
    if state.state:
        parts.append(f"Location: {state.state}")
    if state.purchase_timeline:
        parts.append(f"Timeline: {state.purchase_timeline}")
    if state.finance_interest is not None:
        parts.append(f"Finance interest: {'Yes' if state.finance_interest else 'No'}")
    if state.test_drive_interest is not None:
        parts.append(f"Test drive interest: {'Yes' if state.test_drive_interest else 'No'}")
    if state.objections:
        parts.append(f"Objections raised: {', '.join(state.objections)}")
    if state.negotiation_requested:
        parts.append("Customer has requested a discount/negotiation")
    if state.escalation_requested:
        parts.append("Customer has requested to speak with a human")

    return "\n".join(f"- {p}" for p in parts)


# ---------------------------------------------------------------------------
# State persistence helpers
# ---------------------------------------------------------------------------

def load_customer_state(db_session: ConversationSession) -> CustomerState:
    """Deserialise CustomerState from the session's JSON column."""
    raw = getattr(db_session, "customer_state_json", None)
    if raw:
        try:
            return CustomerState(**json.loads(raw))
        except Exception:
            pass
    return CustomerState()


def save_customer_state(db: DBSession, db_session: ConversationSession, state: CustomerState) -> None:
    """Serialise and persist CustomerState to the session."""
    db_session.customer_state_json = state.model_dump_json()
    # Also sync customer_name to the session model if captured
    if state.customer_name and not db_session.customer_name:
        db_session.customer_name = state.customer_name
    db.commit()


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def process_message(
    session_id: str,
    user_message: str,
    db: DBSession,
) -> ChatResult:
    """
    Process one customer message and return a ChatResult.

    This function:
    1. Loads the session and message history
    2. Persists the user message
    3. Loads CustomerState
    4. Calls the LLM provider
    5. Persists assistant message + updated CustomerState
    6. Returns ChatResult
    """
    from fastapi import HTTPException

    db_session = db.query(ConversationSession).filter(ConversationSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Persist user message
    user_msg = Message(session_id=session_id, role="user", content=user_message)
    db.add(user_msg)
    db.commit()

    # Load full conversation history
    all_msgs = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.timestamp)
        .all()
    )
    llm_msgs: List[Dict[str, str]] = [{"role": m.role, "content": m.content} for m in all_msgs]

    # Load current customer state
    customer_state = load_customer_state(db_session)

    # Call LLM provider
    provider = get_llm_provider()
    result: ChatResult = provider.chat(
        messages=llm_msgs,
        customer_state=customer_state,
        showroom_id=db_session.showroom_id or "HYD-DEL-001",
    )

    # Persist assistant reply
    asst_msg = Message(session_id=session_id, role="assistant", content=result.reply)
    db.add(asst_msg)

    # Persist updated CustomerState
    save_customer_state(db, db_session, result.customer_state)

    return result
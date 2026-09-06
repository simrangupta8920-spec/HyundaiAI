"""
scoring_service.py
Deterministic Lead Scoring Engine.

Scores customers from 0 to 100 based on weighted criteria.

Configurable Weights (Total 100):
- Budget identified: 15
- Specific model selected: 20
- Purchase timeline <=30 days: 20
- Test drive requested: 15
- Finance interest: 10
- High satisfaction: 10
- Strong purchase intent: 10

Classification:
- 80-100 = HOT
- 60-79  = WARM
- 0-59   = LOW
"""
from __future__ import annotations
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session

from app.schemas.customer_state import CustomerState
from app.schemas.scoring import ScoringWeights, LeadScoreResult
from app.models.message import Message
from app.models.score import Score
from app.models.session import ConversationSession


def calculate_lead_score(
    state: CustomerState,
    messages: Optional[List[Dict[str, str]]] = None,
    weights: Optional[ScoringWeights] = None,
) -> LeadScoreResult:
    """
    Deterministically score a lead from 0 to 100 based on customer state and interaction signals.
    Returns LeadScoreResult with total score, classification (HOT/WARM/LOW), reasons, and breakdown.
    """
    if weights is None:
        weights = ScoringWeights()

    reasons: List[str] = []
    breakdown: Dict[str, float] = {
        "budget_identified": 0.0,
        "model_selected": 0.0,
        "timeline_within_30_days": 0.0,
        "test_drive_requested": 0.0,
        "finance_interest": 0.0,
        "high_satisfaction": 0.0,
        "strong_purchase_intent": 0.0,
    }

    all_user_text = " ".join(
        [m.get("content", "") for m in (messages or []) if m.get("role") == "user"]
    ).lower()

    # 1. Budget identified (15 pts)
    has_budget = (
        state.budget_max is not None
        or state.budget_min is not None
        or any(w in all_user_text for w in ["lakh", "budget", "price range", "under 1", "under 2", "around 1"])
    )
    if has_budget:
        breakdown["budget_identified"] = weights.budget_identified
        b_str = f" (₹{state.budget_max} Lakhs)" if state.budget_max else ""
        reasons.append(f"+{weights.budget_identified:.0f} pts: Budget identified{b_str}")

    # 2. Specific model selected (20 pts)
    has_model = (
        state.preferred_model is not None
        or any(m in all_user_text for m in ["creta", "venue", "verna", "i20", "tucson", "ioniq", "exter", "nios", "alcazar", "aura"])
    )
    if has_model:
        breakdown["model_selected"] = weights.model_selected
        m_str = f" ({state.preferred_model})" if state.preferred_model else ""
        reasons.append(f"+{weights.model_selected:.0f} pts: Specific model selected{m_str}")

    # 3. Purchase timeline <= 30 days (20 pts)
    timeline_fast_words = ["immediate", "1 month", "this month", "asap", "urgent", "soon", "ready"]
    has_fast_timeline = (
        (state.purchase_timeline and state.purchase_timeline.lower() in ["immediate", "1 month", "asap"])
        or any(w in all_user_text for w in timeline_fast_words)
    )
    if has_fast_timeline:
        breakdown["timeline_within_30_days"] = weights.timeline_within_30_days
        reasons.append(f"+{weights.timeline_within_30_days:.0f} pts: Purchase timeline <= 30 days")

    # 4. Test drive requested (15 pts)
    has_test_drive = (
        state.test_drive_interest is True
        or any(w in all_user_text for w in ["test drive", "test-drive", "drive it", "try the car", "visit showroom"])
    )
    if has_test_drive:
        breakdown["test_drive_requested"] = weights.test_drive_requested
        reasons.append(f"+{weights.test_drive_requested:.0f} pts: Test drive requested")

    # 5. Finance interest (10 pts)
    has_finance = (
        state.finance_interest is True
        or any(w in all_user_text for w in ["emi", "finance", "loan", "installment", "monthly payment"])
    )
    if has_finance:
        breakdown["finance_interest"] = weights.finance_interest
        reasons.append(f"+{weights.finance_interest:.0f} pts: Finance / EMI interest expressed")

    # 6. High satisfaction (10 pts)
    pos_words = ["good", "great", "awesome", "perfect", "thanks", "thank you", "helpful", "excellent", "love"]
    neg_words = ["terrible", "horrible", "useless", "worst", "hate", "bad service"]
    pos_cnt = sum(1 for w in pos_words if w in all_user_text)
    neg_cnt = sum(1 for w in neg_words if w in all_user_text)

    is_satisfied = (pos_cnt >= neg_cnt) and (len(all_user_text) > 0)
    if is_satisfied:
        breakdown["high_satisfaction"] = weights.high_satisfaction
        reasons.append(f"+{weights.high_satisfaction:.0f} pts: High customer satisfaction")

    # 7. Strong purchase intent (10 pts)
    intent_words = ["book", "quotation", "price quote", "final price", "buy", "purchase", "cash discount", "deal"]
    has_strong_intent = (
        state.negotiation_requested
        or state.escalation_requested
        or any(w in all_user_text for w in intent_words)
    )
    if has_strong_intent:
        breakdown["strong_purchase_intent"] = weights.strong_purchase_intent
        reasons.append(f"+{weights.strong_purchase_intent:.0f} pts: Strong purchase intent / quotation signals")

    # Calculate total score
    total_score = round(sum(breakdown.values()), 1)
    total_score = max(0.0, min(100.0, total_score))

    # Classification
    if total_score >= 80.0:
        classification = "HOT"
    elif total_score >= 60.0:
        classification = "WARM"
    else:
        classification = "LOW"

    return LeadScoreResult(
        score=total_score,
        classification=classification,
        reasons=reasons,
        breakdown=breakdown,
    )


def compute_score(session_id: str, db: Session) -> Score:
    """
    Compute and persist lead score for a given conversation session.
    Backwards compatible with ORM Score model.
    """
    from app.services.conversation_engine import load_customer_state

    db_session = (
        db.query(ConversationSession)
        .filter(ConversationSession.id == session_id)
        .first()
    )
    customer_state = load_customer_state(db_session) if db_session else CustomerState()

    raw_msgs = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.timestamp)
        .all()
    )
    msgs = [{"role": m.role, "content": m.content} for m in raw_msgs]

    res = calculate_lead_score(customer_state, msgs)

    score_record = db.query(Score).filter(Score.session_id == session_id).first()
    if not score_record:
        score_record = Score(session_id=session_id)
        db.add(score_record)

    score_record.intent_score = res.breakdown.get("strong_purchase_intent", 0.0) + res.breakdown.get("timeline_within_30_days", 0.0)
    score_record.satisfaction_score = res.breakdown.get("high_satisfaction", 0.0) * 10.0
    score_record.engagement_score = float(len(msgs) * 10.0)
    score_record.overall_score = res.score
    score_record.classification = res.classification

    full_breakdown = res.breakdown.copy()
    full_breakdown["reasons"] = res.reasons
    full_breakdown["classification"] = res.classification
    score_record.breakdown = full_breakdown

    db.commit()
    db.refresh(score_record)
    return score_record
"""
escalation_service.py
Deterministic Human Escalation Engine.

Escalation Triggers:
1. Customer explicitly asks for a human / manager.
2. Negotiation exceeds AI authority (discount requested > maximum allowed).
3. Customer becomes frustrated (complaint / frustration sentiment).
4. AI cannot confidently answer a question (unsupported spec / low confidence query).
5. Customer has high purchase intent (score >= 80) and requests human assistance.
"""
from __future__ import annotations
from typing import List, Tuple, Dict, Optional, Any
from app.schemas.customer_state import CustomerState


EXPLICIT_HUMAN_KEYWORDS = [
    "human", "manager", "person", "real person", "speak to someone",
    "call me", "talk to human", "sales manager", "executive", "representative"
]

FRUSTRATION_KEYWORDS = [
    "frustrated", "unhelpful", "bad service", "terrible", "useless",
    "stupid", "annoyed", "complaint", "waste of time", "horrible"
]

LOW_CONFIDENCE_KEYWORDS = [
    "custom modification", "third party tuning", "import duty", "import tax",
    "export model", "custom bodykit", "engine swap", "chassis modification"
]

HIGH_INTENT_KEYWORDS = [
    "ready to book", "book now", "final price approval", "instant booking",
    "payment link", "cheque payment", "immediate delivery confirmation"
]


def evaluate_escalation(
    messages: List[Dict[str, str]],
    customer_state: Optional[CustomerState] = None,
    negotiation_result: Optional[Dict[str, Any]] = None,
) -> Tuple[bool, str, str]:
    """
    Evaluate conversation for human escalation triggers.

    Returns:
        (should_escalate: bool, reason: str, priority: str)
        priority: 'normal', 'high', 'urgent'
    """
    if customer_state is None:
        customer_state = CustomerState()

    all_user_text = " ".join(
        [m.get("content", "") for m in (messages or []) if m.get("role") == "user"]
    ).lower()

    last_user_msg = ""
    user_msgs = [m.get("content", "") for m in (messages or []) if m.get("role") == "user"]
    if user_msgs:
        last_user_msg = user_msgs[-1].lower()

    # Trigger 1: Explicit Human Request
    if customer_state.escalation_requested or any(k in last_user_msg for k in EXPLICIT_HUMAN_KEYWORDS):
        return (
            True,
            "Customer explicitly requested to speak with a human sales manager.",
            "high",
        )

    # Trigger 2: Negotiation Exceeds AI Authority
    if negotiation_result and not negotiation_result.get("allowed", True):
        return (
            True,
            negotiation_result.get(
                "reason",
                "Customer requested discount exceeding automated showroom limits.",
            ),
            "high",
        )
    if customer_state.negotiation_requested:
        return (
            True,
            "Customer requested pricing discount requiring Senior Sales Executive approval.",
            "high",
        )

    # Trigger 3: Customer Frustration / Complaint Sentiment
    if any(k in all_user_text for k in FRUSTRATION_KEYWORDS):
        return (
            True,
            "Customer expressed frustration or complaint sentiment during interaction.",
            "urgent",
        )

    # Trigger 4: Low Confidence / Unsupported Query
    if any(k in last_user_msg for k in LOW_CONFIDENCE_KEYWORDS):
        return (
            True,
            "AI unable to confidently answer specialized custom vehicle modification query.",
            "normal",
        )

    # Trigger 5: High Intent Customer Requesting Human Closing Assistance
    known_cnt = customer_state.known_fields_count()
    if (known_cnt >= 4 or customer_state.test_drive_interest) and any(k in last_user_msg for k in HIGH_INTENT_KEYWORDS):
        return (
            True,
            "High intent customer requested human executive assistance to finalize booking.",
            "urgent",
        )

    return False, "", "normal"


def should_escalate(messages: List[str], round_number: int = 1) -> Tuple[bool, str]:
    """Legacy helper for backward compatibility."""
    res_bool, reason, _ = evaluate_escalation(
        messages=[{"role": "user", "content": m} for m in messages]
    )
    if round_number > 3:
        return True, "Negotiation round exceeded limits."
    return res_bool, reason
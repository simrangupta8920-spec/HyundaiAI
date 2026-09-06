from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.models.session import ConversationSession
from app.models.message import Message
from app.services.conversation_engine import process_message
from app.routers.conversation import end_session

router = APIRouter(prefix="/demo", tags=["demo"])

DEMO_SCENARIOS = {
    "scenario_1": {
        "id": "scenario_1",
        "title": "High-Intent Buyer → HOT Lead",
        "description": "Customer with specific model (Creta), clear budget (18L), fast purchase timeline (30 days), test drive & EMI request.",
        "customer_name": "Rahul Sharma",
        "messages": [
            "Hi, I am looking for a Petrol SUV for my family of 5 with a budget around 18 Lakhs. I love the Hyundai Creta.",
            "I want to buy within 30 days. I'd like to book a test drive for this Saturday and explore EMI financing options."
        ]
    },
    "scenario_2": {
        "id": "scenario_2",
        "title": "Excessive Discount → Human Escalation",
        "description": "Customer requests 25% cash discount on Creta exceeding AI authority limit (8%) → Triggers Human Escalation queue.",
        "customer_name": "Vikram Malhotra",
        "messages": [
            "Hi, I want to purchase the Creta SX Petrol, but I need a 25% flat cash discount right now or I will go buy a Tata Harrier."
        ]
    },
    "scenario_3": {
        "id": "scenario_3",
        "title": "Low-Intent Visitor → LOW Lead",
        "description": "Casual visitor with vague budget, 12+ month timeline, and no immediate test drive interest.",
        "customer_name": "Anish Verma",
        "messages": [
            "Hi, I'm just browsing car options in general. Not looking to buy anytime soon.",
            "Maybe a small hatchback under 6 Lakhs next year, no rush at all."
        ]
    }
}


@router.get("/scenarios")
def get_scenarios():
    """List available pre-configured demo scenarios."""
    return list(DEMO_SCENARIOS.values())


@router.post("/run/{scenario_id}")
def run_scenario(scenario_id: str, showroom_id: str = "HYD-DEL-001", db: Session = Depends(get_db)):
    """Run an end-to-end demo scenario programmatically."""
    scenario = DEMO_SCENARIOS.get(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found. Available: {list(DEMO_SCENARIOS.keys())}")

    # 1. Create a session
    session_id = str(uuid.uuid4())
    db_session = ConversationSession(
        id=session_id,
        showroom_id=showroom_id,
        customer_name=scenario["customer_name"],
    )
    db.add(db_session)
    db.commit()

    # 2. Feed messages through conversation engine
    for user_msg in scenario["messages"]:
        process_message(session_id=session_id, user_message=user_msg, db=db)

    # 3. Complete session & run lead scoring/escalation pipeline
    summary_result = end_session(session_id=session_id, db=db)

    return {
        "scenario": scenario,
        "session_id": session_id,
        "summary_result": summary_result,
    }

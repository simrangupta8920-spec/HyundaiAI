"""
test_scoring_engine.py
Comprehensive unit tests for the lead scoring engine.
"""
import pytest
from fastapi.testclient import TestClient
import uuid

from app.main import app
from app.schemas.customer_state import CustomerState
from app.schemas.scoring import ScoringWeights, LeadScoreResult
from app.services.scoring_service import calculate_lead_score, compute_score
from app.models.session import ConversationSession
from app.models.message import Message


@pytest.fixture
def client():
    return TestClient(app)


# ── Scenario 1: HOT Lead (Score >= 80) ────────────────────────────────────────
def test_hot_lead_scenario():
    state = CustomerState(
        customer_name="Arjun",
        budget_max=16.0,
        preferred_model="Creta",
        purchase_timeline="Immediate",
        test_drive_interest=True,
        finance_interest=True,
        negotiation_requested=True,
    )
    msgs = [
        {"role": "user", "content": "I am ready to buy a Hyundai Creta petrol SUV for my family under 16 Lakhs this month. I want a test drive and EMI finance options."}
    ]
    res = calculate_lead_score(state, msgs)
    assert isinstance(res, LeadScoreResult)
    assert res.score >= 80.0
    assert res.classification == "HOT"
    assert len(res.reasons) >= 5
    assert "budget_identified" in res.breakdown
    assert res.breakdown["budget_identified"] == 15.0
    assert res.breakdown["model_selected"] == 20.0
    assert res.breakdown["timeline_within_30_days"] == 20.0
    assert res.breakdown["test_drive_requested"] == 15.0


# ── Scenario 2: WARM Lead (Score 60 - 79) ─────────────────────────────────────
def test_warm_lead_scenario():
    state = CustomerState(
        budget_max=10.0,
        preferred_model="i20",
        purchase_timeline="1 month",
    )
    msgs = [
        {"role": "user", "content": "Looking for an i20 around 10 Lakhs next month."}
    ]
    res = calculate_lead_score(state, msgs)
    assert 60.0 <= res.score <= 79.0
    assert res.classification == "WARM"
    assert any("Budget" in r for r in res.reasons)
    assert any("Specific model" in r for r in res.reasons)


# ── Scenario 3: LOW Lead (Score 0 - 59) ───────────────────────────────────────
def test_low_lead_scenario():
    state = CustomerState()
    msgs = [
        {"role": "user", "content": "Hi, just browsing your cars."}
    ]
    res = calculate_lead_score(state, msgs)
    assert res.score < 60.0
    assert res.classification == "LOW"


# ── Scenario 4: Satisfaction Independent Test ─────────────────────────────────
def test_satisfaction_independent_not_hot():
    """High satisfaction alone without intent signals should NOT make a lead HOT."""
    state = CustomerState()
    msgs = [
        {"role": "user", "content": "Thank you! Great service and very helpful assistant, awesome job!"}
    ]
    res = calculate_lead_score(state, msgs)
    # Satisfaction awards 10 pts, so total score = 10 pts -> LOW
    assert res.score == 10.0
    assert res.classification == "LOW"
    assert "High customer satisfaction" in res.reasons[0]


# ── Scenario 5: Configurable Custom Weights ──────────────────────────────────
def test_custom_configurable_weights():
    custom_weights = ScoringWeights(
        budget_identified=30.0,
        model_selected=30.0,
        timeline_within_30_days=10.0,
        test_drive_requested=10.0,
        finance_interest=10.0,
        high_satisfaction=5.0,
        strong_purchase_intent=5.0,
    )
    state = CustomerState(
        budget_max=12.0,
        preferred_model="Venue",
    )
    res = calculate_lead_score(state, weights=custom_weights)
    # 30 (budget) + 30 (model) = 60 pts
    assert res.score == 60.0
    assert res.classification == "WARM"
    assert res.breakdown["budget_identified"] == 30.0
    assert res.breakdown["model_selected"] == 30.0


# ── Scenario 6: API Integration Test — POST & GET /api/scoring/{session_id} ──
def test_api_scoring_endpoint(client):
    # First create a test session in database via API or DB fixture
    session_id = str(uuid.uuid4())
    start_resp = client.post("/api/conversation/start", json={"showroom_id": "HYD-DEL-001"})
    assert start_resp.status_code == 200
    sess_id = start_resp.json()["id"]

    # Send a message
    client.post("/api/conversation/message", json={"session_id": sess_id, "message": "My budget is 15 Lakhs for a Creta SUV, I want a test drive."})

    # Trigger scoring
    score_resp = client.post(f"/api/scoring/{sess_id}")
    assert score_resp.status_code == 200
    data = score_resp.json()

    assert "overall_score" in data
    assert "classification" in data
    assert "reasons" in data
    assert "breakdown" in data
    assert data["overall_score"] > 0
    assert isinstance(data["reasons"], list)
    assert len(data["reasons"]) > 0

    # Get score
    get_resp = client.get(f"/api/scoring/{sess_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["overall_score"] == data["overall_score"]
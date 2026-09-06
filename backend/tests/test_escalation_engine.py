"""
test_escalation_engine.py
Unit tests for the 5 human escalation triggers and API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
import uuid

from app.main import app
from app.schemas.customer_state import CustomerState
from app.services.escalation_service import evaluate_escalation


@pytest.fixture
def client():
    return TestClient(app)


# ── Trigger 1: Explicit Human Request ─────────────────────────────────────────
def test_explicit_human_request_trigger():
    state = CustomerState(escalation_requested=True)
    msgs = [{"role": "user", "content": "Can I speak to a human sales manager please?"}]
    should_esc, reason, priority = evaluate_escalation(msgs, state)
    assert should_esc is True
    assert "explicitly requested" in reason.lower()
    assert priority == "high"


# ── Trigger 2: Negotiation Exceeds AI Authority ──────────────────────────────
def test_negotiation_exceeded_trigger():
    neg_res = {
        "allowed": False,
        "reason": "Requested discount of ₹1.50 Lakhs exceeds automated ceiling.",
    }
    msgs = [{"role": "user", "content": "I want a 1.5 Lakh discount on Creta."}]
    should_esc, reason, priority = evaluate_escalation(msgs, negotiation_result=neg_res)
    assert should_esc is True
    assert "exceeds" in reason.lower() or "limit" in reason.lower()
    assert priority == "high"


# ── Trigger 3: Customer Frustration / Sentiment ───────────────────────────────
def test_customer_frustration_trigger():
    msgs = [{"role": "user", "content": "This is terrible and useless service, I am frustrated!"}]
    should_esc, reason, priority = evaluate_escalation(msgs)
    assert should_esc is True
    assert "frustration" in reason.lower() or "complaint" in reason.lower()
    assert priority == "urgent"


# ── Trigger 4: Low Confidence / Unsupported Query ─────────────────────────────
def test_low_confidence_query_trigger():
    msgs = [{"role": "user", "content": "Do you offer custom engine swap and import tax calculation?"}]
    should_esc, reason, priority = evaluate_escalation(msgs)
    assert should_esc is True
    assert "unsupported" in reason.lower() or "unable" in reason.lower()
    assert priority == "normal"


# ── Trigger 5: High Intent Requesting Human Assistance ────────────────────────
def test_high_intent_human_assistance_trigger():
    state = CustomerState(
        budget_max=15.0,
        preferred_model="Creta",
        car_type="SUV",
        fuel="Petrol",
        test_drive_interest=True,
    )
    msgs = [{"role": "user", "content": "I am ready to book now and need instant booking approval."}]
    should_esc, reason, priority = evaluate_escalation(msgs, state)
    assert should_esc is True
    assert "high intent" in reason.lower() or "booking" in reason.lower()
    assert priority == "urgent"


# ── API Endpoint Lifecycle Test ────────────────────────────────────────────────
def test_api_escalation_lifecycle(client):
    sess_id = str(uuid.uuid4())

    # 1. Create escalation via POST /api/escalations
    create_payload = {
        "session_id": sess_id,
        "showroom_id": "HYD-DEL-001",
        "reason": "Customer requested discount exceeding automated limits.",
        "priority": "high",
    }
    res_post = client.post("/api/escalations", json=create_payload)
    assert res_post.status_code == 200
    data = res_post.json()
    assert data["status"] == "pending"
    assert data["showroom_id"] == "HYD-DEL-001"
    esc_id = data["id"]

    # 2. Get active queue via GET /api/escalations
    res_get = client.get("/api/escalations")
    assert res_get.status_code == 200
    queue = res_get.json()
    assert any(e["id"] == esc_id for e in queue)

    # 3. Accept escalation (PATCH status = in_progress, assign executive)
    res_patch1 = client.patch(
        f"/api/escalations/{esc_id}",
        json={"status": "in_progress", "assigned_executive": "Rajesh Kumar"},
    )
    assert res_patch1.status_code == 200
    assert res_patch1.json()["status"] == "in_progress"
    assert res_patch1.json()["assigned_executive"] == "Rajesh Kumar"

    # 4. Resolve escalation (PATCH status = resolved)
    res_patch2 = client.patch(
        f"/api/escalations/{esc_id}",
        json={"status": "resolved", "notes": "Offered ₹40,000 corporate discount + accessories. Approved."},
    )
    assert res_patch2.status_code == 200
    assert res_patch2.json()["status"] == "resolved"
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_demo_scenarios():
    """Verify that all 3 demo scenarios are listed properly."""
    response = client.get("/api/demo/scenarios")
    assert response.status_code == 200
    scenarios = response.json()
    assert len(scenarios) == 3
    ids = [s["id"] for s in scenarios]
    assert "scenario_1" in ids
    assert "scenario_2" in ids
    assert "scenario_3" in ids


def test_run_demo_scenario_1_high_intent():
    """Verify Scenario 1: High Intent buyer produces HOT Lead."""
    res = client.post("/api/demo/run/scenario_1?showroom_id=HYD-DEL-001")
    assert res.status_code == 200
    data = res.json()

    assert data["scenario"]["id"] == "scenario_1"
    session_id = data["session_id"]
    assert session_id is not None

    summary = data["summary_result"]
    assert summary["lead"]["status"] in ["hot", "warm"]
    assert summary["score"]["overall_score"] >= 70.0
    assert summary["lead"]["showroom_id"] == "HYD-DEL-001"
    assert "Rahul Sharma" in summary["summary"] or summary["customer_profile"]["customer_name"] == "Rahul Sharma"


def test_run_demo_scenario_2_excessive_discount_escalation():
    """Verify Scenario 2: Excessive discount triggers Human Escalation."""
    res = client.post("/api/demo/run/scenario_2?showroom_id=HYD-DEL-001")
    assert res.status_code == 200
    data = res.json()

    assert data["scenario"]["id"] == "scenario_2"
    summary = data["summary_result"]

    assert summary["session"]["status"] == "escalated"
    assert summary["escalation"] is not None
    assert summary["escalation"]["status"] == "pending"
    assert summary["escalation"]["showroom_id"] == "HYD-DEL-001"


def test_run_demo_scenario_3_low_intent():
    """Verify Scenario 3: Low Intent buyer produces LOW/WARM Lead."""
    res = client.post("/api/demo/run/scenario_3?showroom_id=HYD-DEL-001")
    assert res.status_code == 200
    data = res.json()

    assert data["scenario"]["id"] == "scenario_3"
    summary = data["summary_result"]

    assert summary["score"]["overall_score"] < 60.0 or summary["score"]["classification"] in ["LOW", "WARM"]
    assert summary["escalation"] is None or summary["session"]["status"] != "escalated"


def test_complete_conversation_pipeline():
    """Test full E2E manual conversation lifecycle and completion pipeline."""
    # 1. Start session
    start_res = client.post("/api/conversation/start", json={"showroom_id": "HYD-DEL-001", "customer_name": "Priya Patel"})
    assert start_res.status_code == 200
    session_id = start_res.json()["id"]

    # 2. Send messages
    client.post("/api/conversation/message", json={
        "session_id": session_id,
        "message": "Hi, I am interested in buying a Hyundai Venue Petrol within 15 days."
    })
    client.post("/api/conversation/message", json={
        "session_id": session_id,
        "message": "Can I book a test drive for tomorrow?"
    })

    # 3. End session
    end_res = client.post(f"/api/conversation/{session_id}/end")
    assert end_res.status_code == 200
    end_data = end_res.json()

    assert end_data["session"]["status"] == "ended"
    assert end_data["score"]["overall_score"] >= 60.0
    assert end_data["lead"]["name"] == "Priya Patel"
    assert end_data["lead"]["showroom_id"] == "HYD-DEL-001"
    assert len(end_data["transcript"]) >= 4  # 2 user msgs + 2 assistant msgs

"""
test_negotiation_engine.py
Unit tests for the deterministic negotiation engine service and API endpoint.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.negotiation_engine import (
    NegotiationEvaluateRequest,
    NegotiationEvaluateResponse,
    NegotiationRule,
)
from app.services.negotiation_engine import get_negotiation_rule, evaluate_negotiation


@pytest.fixture
def client():
    return TestClient(app)


# ── Test 1: Negotiation Rule Lookup ─────────────────────────────────────────
def test_get_negotiation_rule_creta():
    rule = get_negotiation_rule("hyundai_creta_delhi")
    assert isinstance(rule, NegotiationRule)
    assert rule.vehicle_id == "hyundai_creta_delhi"
    assert rule.base_price > 0
    assert rule.maximum_discount == 0.40
    assert rule.accessory_offer is not None
    assert rule.requires_human_approval is False


def test_get_negotiation_rule_ioniq_policy():
    rule = get_negotiation_rule("hyundai_ioniq_5_delhi")
    assert isinstance(rule, NegotiationRule)
    assert rule.requires_human_approval is True  # EV policy requires human approval


# ── Test 2: Evaluate Negotiation — Within Automated Limit ─────────────────────
def test_evaluate_negotiation_within_limit():
    # Creta base price ~15.0L, max discount 0.40L
    # Customer asks for ₹0.20L discount (or target 14.80L)
    req = NegotiationEvaluateRequest(
        vehicle_id="hyundai_creta_delhi",
        customer_offer=0.20,  # 0.20 L discount
        customer_context={"budget_max": 15.0},
    )
    res = evaluate_negotiation(req)
    assert isinstance(res, NegotiationEvaluateResponse)
    assert res.allowed is True
    assert res.requires_human is False
    assert res.maximum_allowed_discount == 0.40
    assert "Approved" in res.reason or "accepted" in res.reason.lower()


# ── Test 3: Evaluate Negotiation — Exceeding Discount Limit ─────────────────
def test_evaluate_negotiation_exceeding_limit():
    # Creta base price ~15.0L, max discount 0.40L
    # Customer asks for ₹1.50L discount
    req = NegotiationEvaluateRequest(
        vehicle_id="hyundai_creta_delhi",
        customer_offer=1.50,  # 1.50 L discount exceeds 0.40 L
        customer_context={"budget_max": 15.0},
    )
    res = evaluate_negotiation(req)
    assert isinstance(res, NegotiationEvaluateResponse)
    assert res.allowed is False
    assert res.requires_human is True
    assert res.maximum_allowed_discount == 0.40
    assert res.counter_offer > 0
    assert "exceeds" in res.reason.lower() or "requires" in res.reason.lower()


# ── Test 4: Evaluate Negotiation — Required Human Policy Flag ─────────────────
def test_evaluate_negotiation_forced_human_approval():
    # Ioniq 5 policy forces human approval
    req = NegotiationEvaluateRequest(
        vehicle_id="hyundai_ioniq_5_delhi",
        customer_offer=0.10,
    )
    res = evaluate_negotiation(req)
    assert res.allowed is False
    assert res.requires_human is True
    assert "human manager approval" in res.reason.lower()


# ── Test 5: API Endpoint Integration — POST /api/negotiation/evaluate ───────
def test_api_negotiation_evaluate_endpoint(client):
    payload = {
        "vehicle_id": "hyundai_i20_delhi",
        "customer_offer": 0.25,
        "customer_context": {"timeline": "Immediate"},
    }
    response = client.post("/api/negotiation/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "allowed" in data
    assert "maximum_allowed_discount" in data
    assert "counter_offer" in data
    assert "requires_human" in data
    assert "reason" in data
    assert data["allowed"] is True
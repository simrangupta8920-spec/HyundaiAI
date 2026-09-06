"""
negotiation_engine.py
Deterministic negotiation engine for Hyundai showroom sales.

RULE: The LLM must NEVER independently decide discounts.
All price offers and discount requests MUST be evaluated through this service.
"""
from __future__ import annotations
from typing import Dict, Any, Optional

from app.schemas.negotiation_engine import (
    NegotiationRule,
    NegotiationEvaluateRequest,
    NegotiationEvaluateResponse,
)
from app.services.vehicle_service import get_vehicle_by_id, search_vehicles


# Default negotiation policies per vehicle class (in Lakhs)
_CUSTOM_RULES: Dict[str, Dict[str, Any]] = {
    "hyundai_creta": {
        "maximum_discount": 0.40,  # ₹40,000 max automated discount
        "available_offer": "Festival Exchange Bonus of ₹25,000",
        "accessory_offer": "Complimentary Premium All-Weather Mat & Cover Kit",
        "finance_offer": "7.99% interest rate with HDFC / ICICI",
        "requires_human_approval": False,
    },
    "hyundai_i20": {
        "maximum_discount": 0.30,  # ₹30,000 max
        "available_offer": "Corporate Discount of ₹15,000 + Exchange Bonus ₹15,000",
        "accessory_offer": "Complimentary Basic Accessory Kit",
        "finance_offer": "Low 7.50% interest rate",
        "requires_human_approval": False,
    },
    "hyundai_venue": {
        "maximum_discount": 0.35,  # ₹35,000 max
        "available_offer": "Seasonal Savings Bonus of ₹20,000",
        "accessory_offer": "Free Door Visors & Carpet Matting",
        "finance_offer": "7.99% ROI with zero processing fee",
        "requires_human_approval": False,
    },
    "hyundai_ioniq": {
        "maximum_discount": 0.50,  # ₹50,000 max
        "available_offer": "EV Subsidies + Home Charger Installation",
        "accessory_offer": "Free 7.4kW Wallbox AC Charger",
        "finance_offer": "Green EV Loan at 7.25%",
        "requires_human_approval": True,  # High-value EV requires manager approval
    },
    "hyundai_tucson": {
        "maximum_discount": 0.60,
        "available_offer": "Executive Privilege Bonus of ₹40,000",
        "accessory_offer": "Complimentary Ceramic Coating & Floor Mats",
        "finance_offer": "7.99% Special Rate",
        "requires_human_approval": True,  # Premium SUV requires manager approval
    },
}


def get_negotiation_rule(vehicle_id: str) -> NegotiationRule:
    """
    Construct a deterministic NegotiationRule for a given vehicle_id.
    Pulls base price directly from vehicles.json.
    """
    v = get_vehicle_by_id(vehicle_id)
    if not v:
        # Search by model slug if exact ID fails
        results = search_vehicles(model=vehicle_id)
        if results:
            v = results[0]

    base_price = 12.0  # Safe fallback
    model_name = "Vehicle"
    if v:
        base_price = float(v.get("on_road_price") or v.get("showroom_price") or 12.0)
        model_name = v.get("model", "Vehicle").lower()

    # Match custom policy key or apply default 4% / ₹40,000 cap
    custom_key = next((k for k in _CUSTOM_RULES if k in vehicle_id.lower() or k in model_name), None)
    if custom_key:
        policy = _CUSTOM_RULES[custom_key]
        max_discount = float(policy["maximum_discount"])
        avail_offer = policy["available_offer"]
        acc_offer = policy["accessory_offer"]
        fin_offer = policy["finance_offer"]
        req_human = policy["requires_human_approval"]
    else:
        # Standard default policy: 4% of base price capped at ₹40,000 (0.40 L)
        max_discount = min(round(base_price * 0.04, 2), 0.40)
        avail_offer = "Standard Showroom Exchange Bonus of ₹20,000"
        acc_offer = "Complimentary Basic Accessories Pack"
        fin_offer = "7.99% interest rate with partner banks"
        req_human = base_price > 30.0  # High-value cars require manager approval

    return NegotiationRule(
        vehicle_id=vehicle_id,
        base_price=base_price,
        maximum_discount=max_discount,
        available_offer=avail_offer,
        accessory_offer=acc_offer,
        finance_offer=fin_offer,
        requires_human_approval=req_human,
    )


def evaluate_negotiation(req: NegotiationEvaluateRequest) -> NegotiationEvaluateResponse:
    """
    Deterministically evaluate a customer's offer or discount request.

    Logic:
    - If customer_offer < 2.0 Lakhs, interpret as requested discount amount in Lakhs (e.g. 0.5 = ₹50,000 discount)
    - Otherwise, requested_discount = base_price - customer_offer
    - If requested_discount <= maximum_discount and not requires_human_approval:
        allowed = True, requires_human = False, counter_offer = base_price - maximum_discount (or requested price)
    - If requested_discount > maximum_discount or requires_human_approval:
        allowed = False, requires_human = True, counter_offer = base_price - maximum_discount
    """
    rule = get_negotiation_rule(req.vehicle_id)

    # Determine requested discount amount
    if req.customer_offer <= 2.0:
        # User specified a discount amount (e.g. 0.3 = ₹30,000 discount)
        requested_discount = round(req.customer_offer, 2)
        customer_target_price = round(rule.base_price - requested_discount, 2)
    else:
        # User specified target on-road price (e.g. 14.5 for a 15.0 L car)
        customer_target_price = round(req.customer_offer, 2)
        requested_discount = round(rule.base_price - customer_target_price, 2)

    # 1. Offer at or above full base price
    if requested_discount <= 0:
        return NegotiationEvaluateResponse(
            allowed=True,
            maximum_allowed_discount=rule.maximum_discount,
            counter_offer=customer_target_price,
            requires_human=rule.requires_human_approval,
            reason=(
                f"Customer offer of ₹{customer_target_price:.2f} Lakhs is at or above full on-road price "
                f"(₹{rule.base_price:.2f} Lakhs). Accepted with {rule.accessory_offer}."
            ),
        )

    # 2. Forced human approval policy (e.g. luxury / EV models)
    if rule.requires_human_approval:
        return NegotiationEvaluateResponse(
            allowed=False,
            maximum_allowed_discount=rule.maximum_discount,
            counter_offer=round(rule.base_price - rule.maximum_discount, 2),
            requires_human=True,
            reason=(
                f"Vehicle policy for {rule.vehicle_id} requires human manager approval for all price negotiations. "
                f"Automated floor price is ₹{rule.base_price - rule.maximum_discount:.2f} Lakhs."
            ),
        )

    # 3. Discount within allowed maximum
    if requested_discount <= rule.maximum_discount:
        return NegotiationEvaluateResponse(
            allowed=True,
            maximum_allowed_discount=rule.maximum_discount,
            counter_offer=customer_target_price,
            requires_human=False,
            reason=(
                f"Requested discount of ₹{requested_discount:.2f} Lakhs is within automated approval limit "
                f"(max ₹{rule.maximum_discount:.2f} Lakhs). Approved at ₹{customer_target_price:.2f} Lakhs "
                f"with {rule.accessory_offer}."
            ),
        )

    # 4. Discount exceeds allowed maximum
    floor_price = round(rule.base_price - rule.maximum_discount, 2)
    return NegotiationEvaluateResponse(
        allowed=False,
        maximum_allowed_discount=rule.maximum_discount,
        counter_offer=floor_price,
        requires_human=True,
        reason=(
            f"Requested discount of ₹{requested_discount:.2f} Lakhs exceeds automated approval ceiling "
            f"of ₹{rule.maximum_discount:.2f} Lakhs for base price ₹{rule.base_price:.2f} Lakhs. "
            f"Automated counter offer is ₹{floor_price:.2f} Lakhs; further reductions require Senior Sales Executive approval."
        ),
    )
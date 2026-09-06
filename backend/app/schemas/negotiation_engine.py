"""
negotiation_engine.py
Pydantic schemas for the deterministic negotiation engine.
"""
from __future__ import annotations
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class NegotiationRule(BaseModel):
    """Negotiation rule / pricing policy for a vehicle."""
    vehicle_id: str
    base_price: float                           # In Lakhs (on-road or showroom)
    maximum_discount: float                     # Max allowed discount in Lakhs
    available_offer: Optional[str] = None       # e.g. "Exchange bonus ₹25,000"
    accessory_offer: Optional[str] = None       # e.g. "Free Basic Accessory Kit"
    finance_offer: Optional[str] = None         # e.g. "Special 7.99% interest rate"
    requires_human_approval: bool = False       # Policy flag enforcing human approval


class NegotiationEvaluateRequest(BaseModel):
    """Input payload for POST /api/negotiation/evaluate."""
    vehicle_id: str
    customer_offer: float                       # Offered price or requested total in Lakhs
    customer_context: Optional[Dict[str, Any]] = None


class NegotiationEvaluateResponse(BaseModel):
    """Output payload from POST /api/negotiation/evaluate."""
    allowed: bool
    maximum_allowed_discount: float
    counter_offer: float
    requires_human: bool
    reason: str
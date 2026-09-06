"""
customer_state.py
Pydantic models for tracking structured customer knowledge across a conversation session.
The CustomerState is extracted from each turn and persisted as JSON on the session.
"""
from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field


class CustomerState(BaseModel):
    """Everything the AI knows about the customer so far."""

    # Identity
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    # Budget (in Indian Lakhs, e.g. 15.0 = ₹15 Lakhs)
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None

    # Vehicle preference
    preferred_model: Optional[str] = None       # e.g. "Creta", "i20"
    preferred_variant: Optional[str] = None     # e.g. "SX", "S+", "E"
    car_type: Optional[str] = None              # SUV / Sedan / Hatchback / MUV

    # Technical preference
    fuel: Optional[str] = None                  # Petrol / Diesel / EV / CNG / Hybrid
    transmission: Optional[str] = None          # Manual / Automatic / AMT

    # Lifestyle
    family_size: Optional[int] = None           # Number of regular passengers
    usage: Optional[str] = None                 # City / Highway / Mixed

    # Location (for state-specific pricing)
    state: Optional[str] = None                 # e.g. "Delhi", "Maharashtra"

    # Purchase intent signals
    purchase_timeline: Optional[str] = None     # Immediate / 1 month / 3 months / Just exploring
    finance_interest: Optional[bool] = None
    test_drive_interest: Optional[bool] = None

    # Negotiation & objections
    objections: List[str] = Field(default_factory=list)
    negotiation_requested: bool = False
    escalation_requested: bool = False

    def known_fields_count(self) -> int:
        """Count how many key qualifying fields are known."""
        fields = [
            self.budget_max or self.budget_min,
            self.family_size,
            self.fuel,
            self.usage,
            self.purchase_timeline,
        ]
        return sum(1 for f in fields if f is not None)

    def get_budget_midpoint(self) -> Optional[float]:
        if self.budget_max:
            return self.budget_max
        if self.budget_min:
            return self.budget_min
        return None


class ChatResult(BaseModel):
    """Structured result returned by every LLM provider on each turn."""

    reply: str                                  # Natural language response for the customer
    customer_state: CustomerState               # Updated state after this turn
    recommended_vehicle_ids: List[str] = Field(default_factory=list)  # Vehicle IDs from vehicles.json
    should_escalate: bool = False
    should_collect_lead: bool = False

    def lower(self) -> str:
        return self.reply.lower()

    def __contains__(self, item: object) -> bool:
        if isinstance(item, str):
            return item in self.reply
        return False

    def __str__(self) -> str:
        return self.reply
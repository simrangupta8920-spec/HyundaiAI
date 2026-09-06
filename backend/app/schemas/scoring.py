"""
scoring.py
Pydantic schemas for the lead scoring engine.
"""
from __future__ import annotations
from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class ScoringWeights(BaseModel):
    """Configurable weights for lead scoring engine (Total max = 100 pts)."""
    budget_identified: float = 15.0
    model_selected: float = 20.0
    timeline_within_30_days: float = 20.0
    test_drive_requested: float = 15.0
    finance_interest: float = 10.0
    high_satisfaction: float = 10.0
    strong_purchase_intent: float = 10.0


class LeadScoreResult(BaseModel):
    """Result of evaluating a customer lead score."""
    score: float                                # 0.0 to 100.0
    classification: str                         # "HOT" (80-100), "WARM" (60-79), "LOW" (0-59)
    reasons: List[str]                          # Human-readable list of reasons explaining score
    breakdown: Dict[str, float]                 # Rule name -> score awarded map
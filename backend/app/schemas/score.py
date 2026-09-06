from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Dict, Any, List

class ScoreBase(BaseModel):
    intent_score: float
    satisfaction_score: float
    engagement_score: float
    overall_score: float
    classification: Optional[str] = "LOW"
    reasons: Optional[List[str]] = None
    breakdown: Dict[str, Any]

class ScoreCreate(ScoreBase):
    session_id: str
    lead_id: Optional[int] = None

class ScoreResponse(ScoreBase):
    id: int
    session_id: str
    lead_id: Optional[int] = None
    computed_at: datetime
    model_config = ConfigDict(from_attributes=True)
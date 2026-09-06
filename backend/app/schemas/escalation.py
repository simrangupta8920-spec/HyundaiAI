from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class EscalationBase(BaseModel):
    reason: str
    priority: str = "normal"
    showroom_id: Optional[str] = "HYD-DEL-001"
    assigned_executive: Optional[str] = None

class EscalationCreate(EscalationBase):
    session_id: str
    lead_id: Optional[int] = None

class EscalationUpdate(BaseModel):
    status: Optional[str] = None
    assigned_executive: Optional[str] = None
    notes: Optional[str] = None
    resolved_by: Optional[str] = None

class EscalationResponse(EscalationBase):
    id: int
    session_id: str
    lead_id: Optional[int] = None
    status: str
    triggered_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
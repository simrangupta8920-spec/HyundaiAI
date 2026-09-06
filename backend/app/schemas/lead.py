from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Any

class LeadBase(BaseModel):
    session_id: Optional[str] = None
    showroom_id: Optional[str] = None
    name: str
    phone: str
    email: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    fuel_preference: Optional[str] = None
    body_type_preference: Optional[str] = None
    use_case: Optional[str] = None
    interested_car_ids: Optional[List[Any]] = []
    status: str = "new"
    notes: Optional[str] = None

class LeadCreate(LeadBase):
    session_id: str

class LeadUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class LeadResponse(LeadBase):
    id: int
    session_id: str
    created_at: datetime
    updated_at: datetime
    score: Optional[Any] = None
    model_config = ConfigDict(from_attributes=True)

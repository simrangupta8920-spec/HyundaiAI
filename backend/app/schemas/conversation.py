from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Any, Dict

from app.schemas.customer_state import CustomerState


class SessionStart(BaseModel):
    showroom_id: Optional[str] = "HYD-DEL-001"
    customer_name: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    showroom_id: Optional[str] = None
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class MessageCreate(BaseModel):
    session_id: str
    role: str
    content: str


class MessageResponse(BaseModel):
    id: int
    session_id: str
    role: str
    content: str
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    recommended_car_ids: List[str]          # Vehicle slugs from vehicles.json
    should_escalate: bool
    should_collect_lead: bool
    customer_state: Optional[CustomerState] = None  # Structured customer knowledge
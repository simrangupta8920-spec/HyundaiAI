from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class NegotiationOfferCreate(BaseModel):
    session_id: str
    car_id: int
    customer_offer: float

class NegotiationOfferResponse(BaseModel):
    id: int
    session_id: str
    car_id: Optional[int] = None
    round_number: int
    customer_offer: Optional[float] = None
    ai_counter: Optional[float] = None
    discount_offered: Optional[float] = None
    status: str
    notes: Optional[str] = None
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class NegotiationResult(BaseModel):
    counter_price: Optional[float] = None
    discount: Optional[float] = None
    message: str
    status: str

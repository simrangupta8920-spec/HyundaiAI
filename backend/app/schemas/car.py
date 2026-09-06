from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional

class CarBase(BaseModel):
    model_name: str
    variant: str
    body_type: str
    fuel_type: str
    transmission: str
    price_min: float
    price_max: float
    mileage: str
    engine_cc: int
    seating_capacity: int
    colors: List[str]
    features: List[str]
    image_url: Optional[str] = None
    is_available: bool = True

class CarCreate(CarBase):
    pass

class CarResponse(CarBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CarRecommendRequest(BaseModel):
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    fuel_type: Optional[str] = None
    body_type: Optional[str] = None
    use_case: Optional[str] = None

class CarRecommendResponse(BaseModel):
    cars: List[CarResponse]
    reasoning: str

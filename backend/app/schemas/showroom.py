from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class ShowroomBase(BaseModel):
    name: str
    city: str
    address: str
    sales_executive: str
    phone: str
    active: bool = True

class ShowroomCreate(ShowroomBase):
    id: str

class ShowroomResponse(ShowroomBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

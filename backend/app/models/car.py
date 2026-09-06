from sqlalchemy import Column, Integer, String, Float, Boolean, JSON, DateTime
from datetime import datetime
from app.database import Base

class Car(Base):
    __tablename__ = "car"
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100))
    variant = Column(String(100))
    body_type = Column(String(50))
    fuel_type = Column(String(50))
    transmission = Column(String(50))
    price_min = Column(Float)
    price_max = Column(Float)
    mileage = Column(String(50))
    engine_cc = Column(Integer)
    seating_capacity = Column(Integer)
    colors = Column(JSON)
    features = Column(JSON)
    image_url = Column(String(500))
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

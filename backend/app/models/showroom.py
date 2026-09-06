from sqlalchemy import Column, String, Boolean, DateTime
from datetime import datetime
from app.database import Base

class Showroom(Base):
    __tablename__ = "showroom"
    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    city = Column(String(100), nullable=False)
    address = Column(String(500), nullable=False)
    sales_executive = Column(String(200), nullable=False)
    phone = Column(String(50), nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

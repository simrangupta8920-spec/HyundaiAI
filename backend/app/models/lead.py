from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Lead(Base):
    __tablename__ = "lead"
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("conversation_session.id"), unique=True)
    showroom_id = Column(String(50), ForeignKey("showroom.id"), nullable=True)
    name = Column(String(200))
    phone = Column(String(20))
    email = Column(String(200), nullable=True)
    budget_min = Column(Float, nullable=True)
    budget_max = Column(Float, nullable=True)
    fuel_preference = Column(String(50), nullable=True)
    body_type_preference = Column(String(50), nullable=True)
    use_case = Column(String(200), nullable=True)
    interested_car_ids = Column(JSON)
    status = Column(String(30), default="new")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    session = relationship("ConversationSession", back_populates="lead")
    score = relationship("Score", back_populates="lead", uselist=False)
    escalations = relationship("Escalation", back_populates="lead")

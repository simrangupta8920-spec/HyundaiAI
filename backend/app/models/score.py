from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Score(Base):
    __tablename__ = "score"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(36), ForeignKey("conversation_session.id"), unique=True)
    lead_id = Column(Integer, ForeignKey("lead.id"), nullable=True)
    intent_score = Column(Float)
    satisfaction_score = Column(Float)
    engagement_score = Column(Float)
    overall_score = Column(Float)
    classification = Column(String(20), nullable=True)  # HOT, WARM, LOW
    breakdown = Column(JSON)
    computed_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ConversationSession", back_populates="score")
    lead = relationship("Lead", back_populates="score")
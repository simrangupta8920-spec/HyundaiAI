from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class ConversationSession(Base):
    __tablename__ = "conversation_session"
    id = Column(String(36), primary_key=True, index=True)
    showroom_id = Column(String(50), ForeignKey("showroom.id"), nullable=True)
    customer_name = Column(String(200), nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="active")
    # Serialised CustomerState JSON — updated after every turn
    customer_state_json = Column(Text, nullable=True)

    messages = relationship("Message", back_populates="session")
    lead = relationship("Lead", back_populates="session", uselist=False)
    score = relationship("Score", back_populates="session", uselist=False)
    negotiations = relationship("NegotiationOffer", back_populates="session")
    escalations = relationship("Escalation", back_populates="session")
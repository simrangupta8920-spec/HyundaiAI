from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Escalation(Base):
    __tablename__ = "escalation"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(36), ForeignKey("conversation_session.id"))
    lead_id = Column(Integer, ForeignKey("lead.id"), nullable=True)
    showroom_id = Column(String(50), nullable=True)
    reason = Column(String(500))
    priority = Column(String(20), default="normal")          # low, normal, high, urgent
    status = Column(String(20), default="pending")           # pending, accepted, in_progress, resolved, dismissed
    assigned_executive = Column(String(200), nullable=True)
    triggered_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)

    session = relationship("ConversationSession", back_populates="escalations")
    lead = relationship("Lead", back_populates="escalations")
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class NegotiationOffer(Base):
    __tablename__ = "negotiation_offer"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(36), ForeignKey("conversation_session.id"))
    car_id = Column(Integer, ForeignKey("car.id"), nullable=True)
    round_number = Column(Integer, default=1)
    customer_offer = Column(Float, nullable=True)
    ai_counter = Column(Float, nullable=True)
    discount_offered = Column(Float, nullable=True)
    status = Column(String(30))
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("ConversationSession", back_populates="negotiations")

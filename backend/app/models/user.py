"""
user.py
CRM User model — stores hashed passwords, never plaintext.
Seeded at startup with the default admin account.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name     = Column(String(255), default="")
    role          = Column(String(50), default="executive")   # admin | executive
    showroom_id   = Column(String(50), default=None, nullable=True)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

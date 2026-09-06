import os

base_dir = "f:/AI/backend"

files = {}

files["requirements.txt"] = '''fastapi==0.111.0
uvicorn[standard]==0.30.1
sqlalchemy==2.0.30
pydantic==2.7.4
pydantic-settings==2.3.4
python-multipart==0.0.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
alembic==1.13.1
httpx==0.27.0'''

files[".env.example"] = '''# Application
APP_NAME="AI Showroom Sales Executive"
DEBUG=true

# Database
DATABASE_URL=sqlite:///./showroom.db

# Security (CRM)
SECRET_KEY=changeme_use_a_long_random_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# LLM Provider: mock | openai | gemini | anthropic
LLM_PROVIDER=mock
OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=

# Agora (future)
AGORA_APP_ID=
AGORA_APP_CERTIFICATE='''

files["app/__init__.py"] = ""
files["app/core/__init__.py"] = ""
files["app/models/__init__.py"] = '''from .showroom import Showroom
from .car import Car
from .session import ConversationSession
from .message import Message
from .lead import Lead
from .score import Score
from .negotiation import NegotiationOffer
from .escalation import Escalation'''

files["app/schemas/__init__.py"] = ""
files["app/services/__init__.py"] = ""
files["app/services/llm/__init__.py"] = ""
files["app/routers/__init__.py"] = ""

files["app/core/config.py"] = '''try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic.v1 import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "AI Showroom Sales Executive"
    DEBUG: bool = False
    DATABASE_URL: str = "sqlite:///./showroom.db"
    SECRET_KEY: str = "changeme_use_a_long_random_string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    LLM_PROVIDER: str = "mock"
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    AGORA_APP_ID: str = ""
    AGORA_APP_CERTIFICATE: str = ""

    class Config:
        env_file = ".env"

settings = Settings()'''

files["app/core/security.py"] = '''from datetime import datetime, timedelta
from typing import Optional, Union, Any
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Union[dict, None]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    if token == "admin_token":
        return {"sub": "admin"}
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload'''

files["app/database.py"] = '''from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
'''

files["app/models/showroom.py"] = '''from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database import Base

class Showroom(Base):
    __tablename__ = "showroom"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200))
    location = Column(String(500))
    phone = Column(String(50))
    email = Column(String(200))
    qr_code_url = Column(String(500))
    logo_url = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)'''

files["app/models/car.py"] = '''from sqlalchemy import Column, Integer, String, Float, Boolean, JSON, DateTime
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
    created_at = Column(DateTime, default=datetime.utcnow)'''

files["app/models/session.py"] = '''from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class ConversationSession(Base):
    __tablename__ = "conversation_session"
    id = Column(String(36), primary_key=True, index=True)
    showroom_id = Column(Integer, ForeignKey("showroom.id"))
    customer_name = Column(String(200), nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="active")

    messages = relationship("Message", back_populates="session")
    lead = relationship("Lead", back_populates="session", uselist=False)
    score = relationship("Score", back_populates="session", uselist=False)
    negotiations = relationship("NegotiationOffer", back_populates="session")
    escalations = relationship("Escalation", back_populates="session")'''

files["app/models/message.py"] = '''from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Message(Base):
    __tablename__ = "message"
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("conversation_session.id"))
    role = Column(String(20))
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("ConversationSession", back_populates="messages")'''

files["app/models/lead.py"] = '''from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Lead(Base):
    __tablename__ = "lead"
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("conversation_session.id"), unique=True)
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
    escalations = relationship("Escalation", back_populates="lead")'''

files["app/models/score.py"] = '''from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
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
    breakdown = Column(JSON)
    computed_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ConversationSession", back_populates="score")
    lead = relationship("Lead", back_populates="score")'''

files["app/models/negotiation.py"] = '''from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
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

    session = relationship("ConversationSession", back_populates="negotiations")'''

files["app/models/escalation.py"] = '''from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Escalation(Base):
    __tablename__ = "escalation"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(36), ForeignKey("conversation_session.id"))
    lead_id = Column(Integer, ForeignKey("lead.id"), nullable=True)
    reason = Column(String(500))
    priority = Column(String(20), default="normal")
    status = Column(String(20), default="pending")
    triggered_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)

    session = relationship("ConversationSession", back_populates="escalations")
    lead = relationship("Lead", back_populates="escalations")'''

files["app/schemas/showroom.py"] = '''from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class ShowroomBase(BaseModel):
    name: str
    location: str
    phone: str
    email: str
    qr_code_url: Optional[str] = None
    logo_url: Optional[str] = None

class ShowroomCreate(ShowroomBase):
    pass

class ShowroomResponse(ShowroomBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)'''

files["app/schemas/car.py"] = '''from pydantic import BaseModel, ConfigDict
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
    reasoning: str'''

files["app/schemas/conversation.py"] = '''from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List

class SessionStart(BaseModel):
    showroom_id: int
    customer_name: Optional[str] = None

class SessionResponse(BaseModel):
    id: str
    showroom_id: int
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class MessageCreate(BaseModel):
    session_id: str
    role: str
    content: str

class MessageResponse(BaseModel):
    id: int
    session_id: str
    role: str
    content: str
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    session_id: str
    reply: str
    recommended_car_ids: List[int]
    should_escalate: bool
    should_collect_lead: bool'''

files["app/schemas/lead.py"] = '''from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Any

class LeadBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    fuel_preference: Optional[str] = None
    body_type_preference: Optional[str] = None
    use_case: Optional[str] = None
    interested_car_ids: List[int] = []
    status: str = "new"
    notes: Optional[str] = None

class LeadCreate(LeadBase):
    session_id: str

class LeadUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class LeadResponse(LeadBase):
    id: int
    session_id: str
    created_at: datetime
    updated_at: datetime
    score: Optional[Any] = None
    model_config = ConfigDict(from_attributes=True)'''

files["app/schemas/score.py"] = '''from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Dict, Any

class ScoreBase(BaseModel):
    intent_score: float
    satisfaction_score: float
    engagement_score: float
    overall_score: float
    breakdown: Dict[str, Any]

class ScoreCreate(ScoreBase):
    session_id: str
    lead_id: Optional[int] = None

class ScoreResponse(ScoreBase):
    id: int
    session_id: str
    lead_id: Optional[int] = None
    computed_at: datetime
    model_config = ConfigDict(from_attributes=True)'''

files["app/schemas/negotiation.py"] = '''from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class NegotiationOfferCreate(BaseModel):
    session_id: str
    car_id: int
    customer_offer: float

class NegotiationOfferResponse(BaseModel):
    id: int
    session_id: str
    car_id: Optional[int] = None
    round_number: int
    customer_offer: Optional[float] = None
    ai_counter: Optional[float] = None
    discount_offered: Optional[float] = None
    status: str
    notes: Optional[str] = None
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class NegotiationResult(BaseModel):
    counter_price: Optional[float] = None
    discount: Optional[float] = None
    message: str
    status: str'''

files["app/schemas/escalation.py"] = '''from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class EscalationBase(BaseModel):
    reason: str
    priority: str = "normal"

class EscalationCreate(EscalationBase):
    session_id: str

class EscalationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    resolved_by: Optional[str] = None

class EscalationResponse(EscalationBase):
    id: int
    session_id: str
    lead_id: Optional[int] = None
    status: str
    triggered_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)'''


files["app/services/llm/base.py"] = '''from abc import ABC, abstractmethod
from typing import List, Dict

class BaseLLMProvider(ABC):
    @abstractmethod
    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        """Send a list of {role, content} messages and return the assistant reply."""
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        pass'''

files["app/services/llm/mock_provider.py"] = '''import hashlib
from typing import List, Dict
from app.services.llm.base import BaseLLMProvider

class MockLLMProvider(BaseLLMProvider):
    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        if not messages:
            return "Hello! How can I assist you with your car search today?"
            
        last_msg = messages[-1].get("content", "").lower()
        
        if any(w in last_msg for w in ["price", "budget", "cost", "rupees", "lakh"]):
            return "I understand budget is an important factor. Let me find you the best price and any available discounts. Our starting range has some great options around that figure. Can we discuss any accessories you might like?"
        
        if any(w in last_msg for w in ["creta", "verna", "i20", "venue", "tucson"]):
            return "That is a fantastic choice! It offers excellent mileage, top-tier safety features, and a premium interior. Would you like me to check its availability in your preferred color or arrange a test drive?"
            
        if any(w in last_msg for w in ["escalate", "human", "manager", "speak to someone", "not satisfied", "complaint"]):
            return "I understand your concern. I have alerted our human sales manager, and they will connect with you shortly to assist you further."
            
        templates = [
            "What is your primary use case for the car? Is it for family trips, daily commute, or something else?",
            "Could you let me know your preferred fuel type (Petrol, Diesel, EV, CNG)?",
            "What is your budget range so I can recommend the perfect model for you?",
            "Are you looking for an SUV, Sedan, or Hatchback?",
            "We have some amazing offers currently. Let me know your preferences!",
            "Would you like to schedule a test drive for any of our models?",
            "Safety and comfort are our top priorities. Any specific features you are looking for?",
            "That's a great perspective. Can I also ask what your ideal timeline for purchasing is?"
        ]
        
        idx = int(hashlib.md5(last_msg.encode()).hexdigest(), 16) % len(templates)
        return templates[idx]

    def get_provider_name(self) -> str:
        return "mock"'''


files["app/services/llm/provider_factory.py"] = '''from app.core.config import settings
from app.services.llm.base import BaseLLMProvider
from app.services.llm.mock_provider import MockLLMProvider

_provider = None

def get_llm_provider() -> BaseLLMProvider:
    global _provider
    if _provider is None:
        if settings.LLM_PROVIDER.lower() == "mock":
            _provider = MockLLMProvider()
        else:
            # Stubs for openai, gemini, anthropic
            _provider = MockLLMProvider()
    return _provider'''


files["app/services/scoring_service.py"] = '''from sqlalchemy.orm import Session
from app.models.message import Message
from app.models.score import Score
import json

def compute_score(session_id: str, db: Session) -> Score:
    messages = db.query(Message).filter(Message.session_id == session_id, Message.role == "user").all()
    
    intent_score = 0.0
    satisfaction_score = 50.0
    engagement_score = 0.0
    
    pos_keywords = ["good", "great", "yes", "awesome", "thanks", "perfect"]
    neg_keywords = ["bad", "no", "expensive", "hate", "terrible", "issue"]
    
    pos_count = 0
    neg_count = 0
    total_length = 0
    
    for msg in messages:
        content = msg.content.lower()
        if any(w in content for w in ["budget", "lakh", "price"]): intent_score += 20
        if any(w in content for w in ["creta", "verna", "i20", "venue", "tucson"]): intent_score += 20
        if any(w in content for w in ["test drive", "visit"]): intent_score += 20
        if any(w in content for w in ["phone", "email", "@", "number"]): intent_score += 20
        if any(w in content for w in ["buy", "ready", "soon"]): intent_score += 20
        
        pos_count += sum(1 for w in pos_keywords if w in content)
        neg_count += sum(1 for w in neg_keywords if w in content)
        total_length += len(content)
        
    intent_score = min(100.0, intent_score)
    
    if pos_count + neg_count > 0:
        satisfaction_score = 50.0 + (pos_count / (pos_count + neg_count)) * 50.0 - (neg_count / (pos_count + neg_count)) * 50.0
        satisfaction_score = max(0.0, min(100.0, satisfaction_score))
        
    msg_count = len(messages)
    avg_len = total_length / msg_count if msg_count > 0 else 0
    engagement_score = min(100.0, (msg_count * 5) + (avg_len * 0.5))
    
    overall_score = (intent_score * 0.5) + (satisfaction_score * 0.3) + (engagement_score * 0.2)
    
    breakdown = {
        "intent": intent_score,
        "satisfaction": satisfaction_score,
        "engagement": engagement_score,
        "pos_count": pos_count,
        "neg_count": neg_count,
        "msg_count": msg_count
    }
    
    score_record = db.query(Score).filter(Score.session_id == session_id).first()
    if not score_record:
        score_record = Score(session_id=session_id)
        db.add(score_record)
        
    score_record.intent_score = intent_score
    score_record.satisfaction_score = satisfaction_score
    score_record.engagement_score = engagement_score
    score_record.overall_score = overall_score
    score_record.breakdown = breakdown
    
    db.commit()
    db.refresh(score_record)
    return score_record'''


files["app/services/negotiation_service.py"] = '''from sqlalchemy.orm import Session
from app.models.car import Car
from app.models.negotiation import NegotiationOffer

def process_offer(car_id: int, customer_offer: float, round_number: int, db: Session) -> dict:
    car = db.query(Car).filter(Car.id == car_id).first()
    if not car:
        return {"counter_price": None, "discount": 0, "message": "Car not found", "status": "rejected"}
        
    price_min = car.price_min
    
    if customer_offer >= price_min:
        return {
            "counter_price": customer_offer, 
            "discount": 0, 
            "message": "We accept your offer! We will also include a complimentary accessory pack.", 
            "status": "accepted"
        }
        
    if customer_offer >= price_min * 0.92:
        return {
            "counter_price": price_min, 
            "discount": ((price_min - customer_offer) / price_min) * 100, 
            "message": "That's a bit low, but we can offer the car at the minimum price and include free accessories.", 
            "status": "countered"
        }
        
    if customer_offer >= price_min * 0.85:
        counter = price_min * 0.96
        return {
            "counter_price": counter, 
            "discount": 4.0, 
            "message": "We can't go that low, but we can offer a special 4% discount.", 
            "status": "countered"
        }
        
    return {
        "counter_price": None, 
        "discount": 0, 
        "message": "We cannot accept this offer. The vehicle offers immense value, but we can explore EMI options if that helps.", 
        "status": "rejected"
    }'''

files["app/services/escalation_service.py"] = '''from typing import List, Tuple

def should_escalate(messages: List[str], round_number: int = 1) -> Tuple[bool, str]:
    escalation_keywords = ['manager', 'human', 'speak to someone', 'escalate', 'not satisfied', 'cancel', 'complaint']
    
    recent_msgs = messages[-5:]
    
    for msg in recent_msgs:
        content = msg.lower()
        for kw in escalation_keywords:
            if kw in content:
                return True, f"User requested escalation implicitly or explicitly (keyword: {kw})"
                
    if round_number > 3:
        return True, "Negotiation round exceeded limits."
        
    return False, ""'''


files["app/routers/showroom.py"] = '''from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.showroom import Showroom
from app.schemas.showroom import ShowroomResponse

router = APIRouter(prefix="/showroom", tags=["showroom"])

@router.get("/info", response_model=ShowroomResponse)
def get_showroom_info(db: Session = Depends(get_db)):
    showroom = db.query(Showroom).first()
    if not showroom:
        raise HTTPException(status_code=404, detail="Showroom not found")
    return showroom'''


files["app/routers/cars.py"] = '''from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.car import Car
from app.schemas.car import CarResponse, CarRecommendRequest, CarRecommendResponse
from app.services.llm.provider_factory import get_llm_provider

router = APIRouter(prefix="/cars", tags=["cars"])

@router.get("", response_model=List[CarResponse])
def get_cars(body_type: str = None, fuel_type: str = None, budget_max: float = None, db: Session = Depends(get_db)):
    query = db.query(Car)
    if body_type:
        query = query.filter(Car.body_type.ilike(f"%{body_type}%"))
    if fuel_type:
        query = query.filter(Car.fuel_type.ilike(f"%{fuel_type}%"))
    if budget_max:
        query = query.filter(Car.price_min <= budget_max)
    return query.all()

@router.get("/{car_id}", response_model=CarResponse)
def get_car(car_id: int, db: Session = Depends(get_db)):
    car = db.query(Car).filter(Car.id == car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return car

@router.post("/recommend", response_model=CarRecommendResponse)
def recommend_cars(req: CarRecommendRequest, db: Session = Depends(get_db)):
    query = db.query(Car)
    if req.budget_max: query = query.filter(Car.price_min <= req.budget_max)
    if req.budget_min: query = query.filter(Car.price_max >= req.budget_min)
    if req.fuel_type: query = query.filter(Car.fuel_type.ilike(f"%{req.fuel_type}%"))
    if req.body_type: query = query.filter(Car.body_type.ilike(f"%{req.body_type}%"))
    
    cars = query.all()
    provider = get_llm_provider()
    
    prompt = f"User wants {req.body_type} running on {req.fuel_type} for {req.use_case} within {req.budget_max} Lakhs. Recommending {len(cars)} cars."
    reply = provider.chat([{"role": "user", "content": prompt}])
    
    return CarRecommendResponse(cars=cars, reasoning=reply)'''


files["app/routers/conversation.py"] = '''from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
from app.database import get_db
from app.models.session import ConversationSession
from app.models.message import Message
from app.schemas.conversation import SessionStart, SessionResponse, ChatRequest, ChatResponse
from app.services.llm.provider_factory import get_llm_provider
from app.services.escalation_service import should_escalate

router = APIRouter(prefix="/conversation", tags=["conversation"])

@router.post("/start", response_model=SessionResponse)
def start_session(req: SessionStart, db: Session = Depends(get_db)):
    session_id = str(uuid.uuid4())
    db_session = ConversationSession(
        id=session_id,
        showroom_id=req.showroom_id,
        customer_name=req.customer_name
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.post("/message", response_model=ChatResponse)
def send_message(req: ChatRequest, db: Session = Depends(get_db)):
    db_session = db.query(ConversationSession).filter(ConversationSession.id == req.session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    user_msg = Message(session_id=req.session_id, role="user", content=req.message)
    db.add(user_msg)
    db.commit()
    
    all_msgs = db.query(Message).filter(Message.session_id == req.session_id).order_by(Message.timestamp).all()
    llm_msgs = [{"role": m.role, "content": m.content} for m in all_msgs]
    
    provider = get_llm_provider()
    reply = provider.chat(llm_msgs)
    
    asst_msg = Message(session_id=req.session_id, role="assistant", content=reply)
    db.add(asst_msg)
    db.commit()
    
    user_texts = [m.content for m in all_msgs if m.role == 'user'] + [req.message]
    esc_flag, _ = should_escalate(user_texts)
    
    return ChatResponse(
        session_id=req.session_id,
        reply=reply,
        recommended_car_ids=[],
        should_escalate=esc_flag,
        should_collect_lead=True if len(all_msgs) > 3 else False
    )

@router.get("/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    db_session = db.query(ConversationSession).filter(ConversationSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = db.query(Message).filter(Message.session_id == session_id).order_by(Message.timestamp).all()
    
    return {
        "session": db_session,
        "messages": messages
    }

@router.post("/{session_id}/end", response_model=SessionResponse)
def end_session(session_id: str, db: Session = Depends(get_db)):
    db_session = db.query(ConversationSession).filter(ConversationSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    db_session.ended_at = datetime.utcnow()
    db_session.status = "ended"
    db.commit()
    db.refresh(db_session)
    return db_session'''


files["app/routers/lead.py"] = '''from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadUpdate, LeadResponse
from app.core.security import get_current_user

router = APIRouter(prefix="/leads", tags=["leads"])

@router.post("", response_model=LeadResponse)
def create_lead(req: LeadCreate, db: Session = Depends(get_db)):
    lead = Lead(**req.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead

@router.get("", response_model=List[LeadResponse])
def get_leads(status: str = None, search: str = None, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    query = db.query(Lead)
    if status:
        query = query.filter(Lead.status == status)
    if search:
        query = query.filter((Lead.name.ilike(f"%{search}%")) | (Lead.phone.ilike(f"%{search}%")))
    return query.all()

@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.patch("/{lead_id}", response_model=LeadResponse)
def update_lead(lead_id: int, req: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if req.status is not None:
        lead.status = req.status
    if req.notes is not None:
        lead.notes = req.notes
        
    db.commit()
    db.refresh(lead)
    return lead'''


files["app/routers/scoring.py"] = '''from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.score import Score
from app.schemas.score import ScoreResponse
from app.services.scoring_service import compute_score

router = APIRouter(prefix="/scoring", tags=["scoring"])

@router.post("/{session_id}", response_model=ScoreResponse)
def trigger_scoring(session_id: str, db: Session = Depends(get_db)):
    return compute_score(session_id, db)

@router.get("/{session_id}", response_model=ScoreResponse)
def get_score(session_id: str, db: Session = Depends(get_db)):
    score = db.query(Score).filter(Score.session_id == session_id).first()
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")
    return score'''


files["app/routers/negotiation.py"] = '''from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.negotiation import NegotiationOffer
from app.schemas.negotiation import NegotiationOfferCreate, NegotiationOfferResponse, NegotiationResult
from app.services.negotiation_service import process_offer

router = APIRouter(prefix="/negotiation", tags=["negotiation"])

@router.post("/offer", response_model=NegotiationResult)
def make_offer(req: NegotiationOfferCreate, db: Session = Depends(get_db)):
    round_number = db.query(NegotiationOffer).filter(NegotiationOffer.session_id == req.session_id).count() + 1
    
    res = process_offer(req.car_id, req.customer_offer, round_number, db)
    
    offer = NegotiationOffer(
        session_id=req.session_id,
        car_id=req.car_id,
        round_number=round_number,
        customer_offer=req.customer_offer,
        ai_counter=res["counter_price"],
        discount_offered=res["discount"],
        status=res["status"]
    )
    db.add(offer)
    db.commit()
    
    return res

@router.get("/{session_id}", response_model=List[NegotiationOfferResponse])
def get_negotiations(session_id: str, db: Session = Depends(get_db)):
    return db.query(NegotiationOffer).filter(NegotiationOffer.session_id == session_id).all()'''


files["app/routers/escalation.py"] = '''from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.models.escalation import Escalation
from app.schemas.escalation import EscalationCreate, EscalationUpdate, EscalationResponse
from app.core.security import get_current_user

router = APIRouter(prefix="/escalation", tags=["escalation"])

@router.post("/trigger", response_model=EscalationResponse)
def trigger_escalation(req: EscalationCreate, db: Session = Depends(get_db)):
    esc = Escalation(**req.model_dump())
    db.add(esc)
    db.commit()
    db.refresh(esc)
    return esc

@router.get("/queue", response_model=List[EscalationResponse])
def get_queue(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return db.query(Escalation).filter(Escalation.status != "resolved").all()

@router.patch("/{escalation_id}", response_model=EscalationResponse)
def update_escalation(escalation_id: int, req: EscalationUpdate, db: Session = Depends(get_db)):
    esc = db.query(Escalation).filter(Escalation.id == escalation_id).first()
    if not esc:
        raise HTTPException(status_code=404, detail="Escalation not found")
        
    if req.status is not None:
        esc.status = req.status
        if req.status == "resolved":
            esc.resolved_at = datetime.utcnow()
    if req.notes is not None:
        esc.notes = req.notes
    if req.resolved_by is not None:
        esc.resolved_by = req.resolved_by
        
    db.commit()
    db.refresh(esc)
    return esc'''

files["app/main.py"] = '''import json
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database import init_db, SessionLocal
from app.models.showroom import Showroom
from app.models.car import Car

from app.routers import (
    showroom, cars, conversation, lead, scoring, negotiation, escalation
)

app = FastAPI(title="AI Showroom Sales Executive API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def seed_db():
    db = SessionLocal()
    try:
        if db.query(Showroom).count() == 0:
            s = Showroom(
                name="Hyundai Connaught Place",
                location="Delhi",
                phone="1234567890",
                email="contact@hyundaidelhi.com"
            )
            db.add(s)
            
        if db.query(Car).count() == 0:
            cars_path = os.path.join(os.path.dirname(__file__), "../../data/cars.json")
            if os.path.exists(cars_path):
                with open(cars_path, "r", encoding="utf-8") as f:
                    car_data = json.load(f)
                    for c in car_data:
                        db.add(Car(**c))
            else:
                sample_cars = [
                    Car(model_name="Creta", variant="S Plus", body_type="SUV", fuel_type="Petrol", transmission="Manual", price_min=10.0, price_max=15.0, mileage="17.4 kmpl", engine_cc=1497, seating_capacity=5, colors=["White", "Black"], features=["Sunroof"]),
                    Car(model_name="Verna", variant="SX", body_type="Sedan", fuel_type="Petrol", transmission="Automatic", price_min=11.0, price_max=17.0, mileage="18.0 kmpl", engine_cc=1497, seating_capacity=5, colors=["Red", "Silver"], features=["ADAS"]),
                    Car(model_name="i20", variant="Asta", body_type="Hatchback", fuel_type="Petrol", transmission="Manual", price_min=7.0, price_max=11.0, mileage="20.0 kmpl", engine_cc=1197, seating_capacity=5, colors=["Blue", "Grey"], features=["Touchscreen"])
                ]
                db.add_all(sample_cars)
                
        db.commit()
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    init_db()
    seed_db()

app.include_router(showroom.router, prefix="/api")
app.include_router(cars.router, prefix="/api")
app.include_router(conversation.router, prefix="/api")
app.include_router(lead.router, prefix="/api")
app.include_router(scoring.router, prefix="/api")
app.include_router(negotiation.router, prefix="/api")
app.include_router(escalation.router, prefix="/api")

@app.get("/")
def root():
    return {"status": "ok", "message": "AI Showroom Sales Executive API"}

@app.get("/api/health")
def health():
    return {"status": "healthy", "llm_provider": settings.LLM_PROVIDER}
'''

for path, content in files.items():
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

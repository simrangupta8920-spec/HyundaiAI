from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadUpdate, LeadResponse
from app.core.security import get_current_user

router = APIRouter(prefix="/leads", tags=["leads"])

from app.models.session import ConversationSession

@router.post("", response_model=LeadResponse)
def create_lead(req: LeadCreate, db: Session = Depends(get_db)):
    data = req.model_dump()
    if not data.get("showroom_id") and data.get("session_id"):
        sess = db.query(ConversationSession).filter(ConversationSession.id == data["session_id"]).first()
        if sess and sess.showroom_id:
            data["showroom_id"] = sess.showroom_id
            
    lead = Lead(**data)
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
    return lead

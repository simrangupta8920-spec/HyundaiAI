from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.escalation import Escalation
from app.schemas.escalation import (
    EscalationCreate,
    EscalationUpdate,
    EscalationResponse,
)

router = APIRouter(tags=["escalation"])


@router.post("/escalations", response_model=EscalationResponse)
@router.post("/escalation/trigger", response_model=EscalationResponse)
def trigger_escalation(req: EscalationCreate, db: Session = Depends(get_db)):
    esc = Escalation(**req.model_dump())
    db.add(esc)
    db.commit()
    db.refresh(esc)
    return esc


@router.get("/escalations", response_model=List[EscalationResponse])
@router.get("/escalation/queue", response_model=List[EscalationResponse])
def get_escalations_queue(db: Session = Depends(get_db)):
    return (
        db.query(Escalation)
        .filter(Escalation.status != "resolved")
        .order_by(Escalation.triggered_at.desc())
        .all()
    )


@router.patch("/escalations/{escalation_id}", response_model=EscalationResponse)
@router.patch("/escalation/{escalation_id}", response_model=EscalationResponse)
def update_escalation(
    escalation_id: int, req: EscalationUpdate, db: Session = Depends(get_db)
):
    esc = db.query(Escalation).filter(Escalation.id == escalation_id).first()
    if not esc:
        raise HTTPException(status_code=404, detail="Escalation not found")

    if req.status is not None:
        esc.status = req.status
        if req.status == "resolved":
            esc.resolved_at = datetime.utcnow()
    if req.assigned_executive is not None:
        esc.assigned_executive = req.assigned_executive
    if req.notes is not None:
        esc.notes = req.notes
    if req.resolved_by is not None:
        esc.resolved_by = req.resolved_by

    db.commit()
    db.refresh(esc)
    return esc
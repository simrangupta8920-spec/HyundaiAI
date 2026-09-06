from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.showroom import Showroom
from app.schemas.showroom import ShowroomResponse

from typing import List

router = APIRouter(prefix="/showroom", tags=["showroom"])

@router.get("/list", response_model=List[ShowroomResponse])
def list_showrooms(db: Session = Depends(get_db)):
    return db.query(Showroom).filter(Showroom.active == True).all()

@router.get("/info", response_model=ShowroomResponse)
def get_showroom_info(db: Session = Depends(get_db)):
    showroom = db.query(Showroom).filter(Showroom.active == True).first()
    if not showroom:
        raise HTTPException(status_code=404, detail="Showroom not found")
    return showroom

@router.get("/{showroom_id}", response_model=ShowroomResponse)
def get_showroom_by_id(showroom_id: str, db: Session = Depends(get_db)):
    showroom = db.query(Showroom).filter(Showroom.id == showroom_id).first()
    if not showroom:
        raise HTTPException(status_code=404, detail=f"Showroom '{showroom_id}' not found")
    return showroom

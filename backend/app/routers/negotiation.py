from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.negotiation import NegotiationOffer
from app.schemas.negotiation import (
    NegotiationOfferCreate,
    NegotiationOfferResponse,
    NegotiationResult,
)
from app.schemas.negotiation_engine import (
    NegotiationEvaluateRequest,
    NegotiationEvaluateResponse,
)
from app.services.negotiation_service import process_offer
from app.services.negotiation_engine import evaluate_negotiation

router = APIRouter(prefix="/negotiation", tags=["negotiation"])


@router.post("/evaluate", response_model=NegotiationEvaluateResponse)
def evaluate_negotiation_endpoint(req: NegotiationEvaluateRequest):
    """
    Deterministic negotiation evaluation API.
    Input: vehicle_id, customer_offer, customer_context
    Output: allowed, maximum_allowed_discount, counter_offer, requires_human, reason
    """
    return evaluate_negotiation(req)


@router.post("/offer", response_model=NegotiationResult)
def make_offer(req: NegotiationOfferCreate, db: Session = Depends(get_db)):
    round_number = (
        db.query(NegotiationOffer)
        .filter(NegotiationOffer.session_id == req.session_id)
        .count()
        + 1
    )

    res = process_offer(req.car_id, req.customer_offer, round_number, db)

    offer = NegotiationOffer(
        session_id=req.session_id,
        car_id=req.car_id,
        round_number=round_number,
        customer_offer=req.customer_offer,
        ai_counter=res["counter_price"],
        discount_offered=res["discount"],
        status=res["status"],
    )
    db.add(offer)
    db.commit()

    return res


@router.get("/{session_id}", response_model=List[NegotiationOfferResponse])
def get_negotiations(session_id: str, db: Session = Depends(get_db)):
    return (
        db.query(NegotiationOffer)
        .filter(NegotiationOffer.session_id == session_id)
        .all()
    )
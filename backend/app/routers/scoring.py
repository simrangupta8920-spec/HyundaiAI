from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.score import Score
from app.schemas.score import ScoreResponse
from app.services.scoring_service import compute_score

router = APIRouter(prefix="/scoring", tags=["scoring"])


@router.post("/{session_id}", response_model=ScoreResponse)
def trigger_scoring(session_id: str, db: Session = Depends(get_db)):
    score_record = compute_score(session_id, db)
    reasons = (
        score_record.breakdown.get("reasons", [])
        if isinstance(score_record.breakdown, dict)
        else []
    )
    return ScoreResponse(
        id=score_record.id,
        session_id=score_record.session_id,
        lead_id=score_record.lead_id,
        intent_score=score_record.intent_score or 0.0,
        satisfaction_score=score_record.satisfaction_score or 0.0,
        engagement_score=score_record.engagement_score or 0.0,
        overall_score=score_record.overall_score or 0.0,
        classification=score_record.classification or "LOW",
        reasons=reasons,
        breakdown=score_record.breakdown or {},
        computed_at=score_record.computed_at,
    )


@router.get("/{session_id}", response_model=ScoreResponse)
def get_score(session_id: str, db: Session = Depends(get_db)):
    score_record = db.query(Score).filter(Score.session_id == session_id).first()
    if not score_record:
        raise HTTPException(status_code=404, detail="Score not found")
    reasons = (
        score_record.breakdown.get("reasons", [])
        if isinstance(score_record.breakdown, dict)
        else []
    )
    return ScoreResponse(
        id=score_record.id,
        session_id=score_record.session_id,
        lead_id=score_record.lead_id,
        intent_score=score_record.intent_score or 0.0,
        satisfaction_score=score_record.satisfaction_score or 0.0,
        engagement_score=score_record.engagement_score or 0.0,
        overall_score=score_record.overall_score or 0.0,
        classification=score_record.classification or "LOW",
        reasons=reasons,
        breakdown=score_record.breakdown or {},
        computed_at=score_record.computed_at,
    )
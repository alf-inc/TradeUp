from fastapi import APIRouter
from app.core.firebase import db
from app.services.ratings_service import submit_rating

router = APIRouter(prefix="/ratings", tags=["ratings"])

@router.post("/submit")
def rate_trade(tradeId: str, raterUserId: str, score: float):
    return submit_rating(db, tradeId, raterUserId, score)
    
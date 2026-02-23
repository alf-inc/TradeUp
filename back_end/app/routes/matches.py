from fastapi import APIRouter
from app.services.match_checker import check_match_only
from app.core.firebase import db

router = APIRouter(prefix="/matches", tags=["matches"])

@router.post("/check")
def check_match(likerUserId: str, likedItemId: str):
    return check_match_only(db, likerUserId, likedItemId)
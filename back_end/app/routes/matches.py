from fastapi import APIRouter
from app.services.match_checker import check_match_only
from app.services.match_and_notify import check_match_and_notify
from app.core.firebase import db

router = APIRouter(prefix="/matches", tags=["matches"])

@router.post("/check")
def check_match(likerUserId: str, likedItemId: str):
    return check_match_only(db, likerUserId, likedItemId)

@router.post("/check-and-notify")
def check_and_notify(likerUserId: str, likedItemId: str):
    return check_match_and_notify(db, likerUserId, likedItemId)
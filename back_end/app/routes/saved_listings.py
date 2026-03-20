from fastapi import APIRouter
from app.services.saved_listing_service import toggle_saved_listing, get_saved_listings
from app.core.firebase import db

router = APIRouter(prefix="/saved-listings", tags=["saved-listings"])


@router.post("/toggle")
def toggle(userId: str, listingId: str):
    return toggle_saved_listing(db, userId, listingId)


@router.get("")
def get_saved(userId: str):
    return get_saved_listings(db, userId)

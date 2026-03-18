from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.offer_service import create_offer, get_offers_for_user
from app.core.firebase import db

router = APIRouter(prefix="/offers", tags=["offers"])


class CreateOfferRequest(BaseModel):
    fromUserId: str
    toUserId: str
    offeredItemIds: List[str]
    requestedItemId: str


@router.post("/create")
def create_offer_route(request: CreateOfferRequest):
    return create_offer(
        db=db,
        from_user_id=request.fromUserId,
        to_user_id=request.toUserId,
        offered_item_ids=request.offeredItemIds,
        requested_item_id=request.requestedItemId,
    )


@router.get("")
def get_offers(userId: str, direction: str = "incoming", status: Optional[str] = None):
    return get_offers_for_user(
        db=db,
        user_id=userId,
        direction=direction,
        status=status,
    )

from typing import Optional, List
from fastapi import HTTPException
from google.cloud import firestore
from app.services.notification_service import create_offer_notification, create_mutual_match_notification


def create_offer(
    db,
    from_user_id: str,
    to_user_id: str,
    offered_item_ids: List[str],
    requested_item_id: str,
):
    # Validate offered items belong to from_user_id
    offered_items_details = []
    for item_id in offered_item_ids:
        item_snap = db.collection("items").document(item_id).get()
        if not item_snap.exists:
            raise HTTPException(status_code=404, detail=f"Offered item {item_id} not found")
        item = item_snap.to_dict()
        if item.get("userId") != from_user_id:
            raise HTTPException(status_code=403, detail=f"Item {item_id} does not belong to the offering user")
        offered_items_details.append({
            "id": item_id,
            "title": item.get("title", ""),
            "image": item.get("imageUrl", ""),
        })

    # Validate requested item belongs to to_user_id
    requested_snap = db.collection("items").document(requested_item_id).get()
    if not requested_snap.exists:
        raise HTTPException(status_code=404, detail="Requested item not found")
    requested_item = requested_snap.to_dict()
    if requested_item.get("userId") != to_user_id:
        raise HTTPException(status_code=403, detail="Requested item does not belong to the target user")

    # Create offer document
    offer_data = {
        "fromUserId": from_user_id,
        "toUserId": to_user_id,
        "offeredItemIds": offered_item_ids,
        "requestedItemId": requested_item_id,
        "status": "pending",
        "createdAt": firestore.SERVER_TIMESTAMP,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }

    _, offer_ref = db.collection("offers").add(offer_data)
    offer_id = offer_ref.id

    # Create MUTUAL_MATCH notifications for the specific items the user chose
    for item_id in offered_item_ids:
        create_mutual_match_notification(
            db,
            receiver_user_id=from_user_id,
            other_user_id=to_user_id,
            item_id=requested_item_id,
            mutual_item_id=item_id,
        )
        create_mutual_match_notification(
            db,
            receiver_user_id=to_user_id,
            other_user_id=from_user_id,
            item_id=item_id,
            mutual_item_id=requested_item_id,
        )

    # Send offer notification to the receiver
    create_offer_notification(
        db=db,
        receiver_user_id=to_user_id,
        from_user_id=from_user_id,
        offer_id=offer_id,
        offered_items=offered_items_details,
        requested_item_id=requested_item_id,
        requested_item_title=requested_item.get("title", ""),
    )

    return {
        "offerId": offer_id,
        "fromUserId": from_user_id,
        "toUserId": to_user_id,
        "offeredItemIds": offered_item_ids,
        "requestedItemId": requested_item_id,
        "status": "pending",
    }


def get_offers_for_user(
    db,
    user_id: str,
    direction: str = "incoming",
    status: Optional[str] = None,
):
    if direction == "incoming":
        query = db.collection("offers").where("toUserId", "==", user_id)
    elif direction == "outgoing":
        query = db.collection("offers").where("fromUserId", "==", user_id)
    else:
        raise HTTPException(status_code=400, detail="direction must be 'incoming' or 'outgoing'")

    if status:
        query = query.where("status", "==", status)

    docs = query.stream()
    offers = []
    for doc in docs:
        offer = doc.to_dict()
        offer["offerId"] = doc.id
        offers.append(offer)

    return {"offers": offers}

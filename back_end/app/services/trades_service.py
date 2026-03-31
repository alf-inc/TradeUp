# back_end/app/services/trades_service.py

from fastapi import HTTPException
from google.cloud.firestore_v1.base_query import FieldFilter

def _build_match_key(user_a: str, user_b: str, item_a: str, item_b: str) -> str:
    """
    Deterministic key so we don't create duplicate trades.
    (Sort users + sort items)
    """
    u1, u2 = sorted([user_a, user_b])
    i1, i2 = sorted([item_a, item_b])
    return f"{u1}__{u2}__{i1}__{i2}"

def confirm_if_both_accepted(db, notification_id: str):
    """
    Called after someone clicks ACCEPT.
    If BOTH users' notifications are accepted, create a completed trade doc.

    Assumes notification doc has:
      - userId
      - type == "MUTUAL_MATCH"
      - status == "accepted" / "rejected" (or missing)
      - payload: { otherUserId, itemId, mutualItemId }

    For the current user's notification:
      - payload.itemId       = OTHER user's item
      - payload.mutualItemId = MY item
    """
    notif_ref = db.collection("notifications").document(notification_id)
    notif_snap = notif_ref.get()

    if not notif_snap.exists:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif = notif_snap.to_dict()
    if notif.get("type") != "MUTUAL_MATCH":
        raise HTTPException(status_code=400, detail="Not a MUTUAL_MATCH notification")

    status = notif.get("status")
    if status != "accepted":
        # If they haven't accepted yet, nothing to confirm
        return {"confirmed": False, "reason": "This notification is not accepted yet."}

    user_id = notif.get("userId")
    payload = notif.get("payload") or {}
    other_user_id = payload.get("otherUserId")
    their_item_id = payload.get("itemId")        # other user's item
    my_item_id = payload.get("mutualItemId")     # my item

    if not (user_id and other_user_id and their_item_id and my_item_id):
        raise HTTPException(status_code=400, detail="Notification payload missing required fields")

    # Find the other user's corresponding notification
    # (exactly what Doug’s frontend comment describes)
    q = (
        db.collection("notifications")
        .where(filter=FieldFilter("userId", "==", other_user_id))
        .where(filter=FieldFilter("type", "==", "MUTUAL_MATCH"))
        .where(filter=FieldFilter("payload.otherUserId", "==", user_id))
        .where(filter=FieldFilter("payload.itemId", "==", my_item_id))          # swapped
        .where(filter=FieldFilter("payload.mutualItemId", "==", their_item_id)) # swapped
        .limit(1)
    )

    other_docs = list(q.stream())
    if not other_docs:
        return {"confirmed": False, "reason": "Other user's notification not found yet."}

    other_notif_ref = other_docs[0].reference
    other_notif = other_docs[0].to_dict()
    if other_notif.get("status") != "accepted":
        return {"confirmed": False, "reason": "Other user has not accepted yet."}

    # Both accepted -> create completed_trades
    match_key = _build_match_key(user_id, other_user_id, my_item_id, their_item_id)

    trade_ref = db.collection("completed_trades").document(match_key)
    trade_snap = trade_ref.get()

    if not trade_snap.exists:
        trade_ref.set({
            "trade_id": match_key,   # add this
            "matchKey": match_key,
            "user1_id": user_id,
            "user2_id": other_user_id,
            "item1_id": my_item_id,
            "item2_id": their_item_id,
            "user1_rating": None,
            "user2_rating": None,
            "status": "confirmed",
            "completedAt": firestore.SERVER_TIMESTAMP,
        })

        # Archive both traded items so they no longer appear in feed/profile
        db.collection("items").document(my_item_id).update({
            "isArchived": True,
            "archivedAt": firestore.SERVER_TIMESTAMP,
        })

        db.collection("items").document(their_item_id).update({
            "isArchived": True,
            "archivedAt": firestore.SERVER_TIMESTAMP,
            "status": "confirmed",  # or "completed" if your team prefers
        })

    # Optional: mark both notifications as "confirmed"
    notif_ref.update({"confirmed": True})
    other_notif_ref.update({"confirmed": True})

    return {"confirmed": True, "tradeId": match_key}


def get_trade_history_for_user(db, user_id: str):
    """
    Firestore doesn't do OR queries easily, so we run 2 queries and merge.
    """
    trades = []

    q1 = db.collection("completed_trades").where(filter=FieldFilter("user1_id", "==", user_id)).stream()
    q2 = db.collection("completed_trades").where(filter=FieldFilter("user2_id", "==", user_id)).stream()

    seen = set()

    for snap in list(q1) + list(q2):
        if snap.id in seen:
            continue
        seen.add(snap.id)
        d = snap.to_dict()
        d["id"] = snap.id
        trades.append(d)

    return {"trades": trades}
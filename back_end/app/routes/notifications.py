from fastapi import APIRouter, HTTPException
from app.core.firebase import db
from google.cloud import firestore

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("")
def get_notifications(userId: str, unreadOnly: bool = False, limit: int = 50):
    q = db.collection("notifications").where("userId", "==", userId)

    if unreadOnly:
        q = q.where("read", "==", False)

    docs = list(q.stream())
    docs.sort(key=lambda d: d.to_dict().get("createdAt") or "", reverse=True)
    docs = docs[:limit]
    out = []
    for d in docs:
        item = d.to_dict()
        item["id"] = d.id
        out.append(item)

    return {"notifications": out}

@router.patch("/{notification_id}/read")
def mark_notification_read(notification_id: str, userId: str):
    ref = db.collection("notifications").document(notification_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Notification not found")

    data = snap.to_dict()
    if data.get("userId") != userId:
        raise HTTPException(status_code=403, detail="Forbidden")

    ref.set(
        {"read": True, "readAt": firestore.SERVER_TIMESTAMP},
        merge=True
    )
    return {"ok": True, "id": notification_id}
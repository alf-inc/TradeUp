from fastapi import APIRouter
from app.core.firebase import db

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("")
def get_notifications(userId: str, unreadOnly: bool = False, limit: int = 50):
    q = db.collection("notifications").where("userId", "==", userId)

    if unreadOnly:
        q = q.where("read", "==", False)

    # Order by createdAt desc (needs createdAt present; first few may be null until server sets)
    q = q.order_by("createdAt", direction="DESCENDING").limit(limit)

    docs = q.stream()
    out = []
    for d in docs:
        item = d.to_dict()
        item["id"] = d.id
        out.append(item)

    return {"notifications": out}
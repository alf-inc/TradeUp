from typing import Dict, Any, Optional
from google.cloud import firestore

def _match_key(user_a: str, user_b: str, item_a: str, item_b: str) -> str:
    """
    Stable key for a mutual match event.
    We sort users to make it order-independent.
    item_a/item_b are the two items involved (one from each user).
    """
    u1, u2 = sorted([user_a, user_b])
    return f"{u1}__{u2}__{item_a}__{item_b}"

def create_mutual_match_notification(
    db,
    receiver_user_id: str,
    other_user_id: str,
    item_id: str,
    mutual_item_id: str,
) -> Dict[str, Any]:
    key = _match_key(receiver_user_id, other_user_id, item_id, mutual_item_id)
    doc_id = f"{receiver_user_id}__MUTUAL_MATCH__{key}"
    doc_ref = db.collection("notifications").document(doc_id)

    # Fetch display info
    other_user_snap = db.collection("users").document(other_user_id).get()
    other_user = other_user_snap.to_dict() if other_user_snap.exists else {}

    item_snap = db.collection("items").document(item_id).get()
    item = item_snap.to_dict() if item_snap.exists else {}

    mutual_item_snap = db.collection("items").document(mutual_item_id).get()
    mutual_item = mutual_item_snap.to_dict() if mutual_item_snap.exists else {}

    data = {
        "userId": receiver_user_id,
        "type": "MUTUAL_MATCH",
        "read": False,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "payload": {
            "otherUserId": other_user_id,
            "otherUserName": other_user.get("name", ""),
            "otherUserAvatar": other_user.get("photoURL", ""),
            "itemId": item_id,
            "itemTitle": item.get("title", ""),
            "mutualItemId": mutual_item_id,
            "mutualItemTitle": mutual_item.get("title", ""),
            "matchKey": key,
        },
    }

    doc_ref.set(data, merge=True)
    return {"id": doc_id, **data}
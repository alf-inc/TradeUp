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
    """
    Create a notification for receiver_user_id about a mutual match.
    Idempotent: uses deterministic doc id to prevent duplicates.
    """
    key = _match_key(receiver_user_id, other_user_id, item_id, mutual_item_id)

    # Deterministic doc id for idempotency per receiver
    doc_id = f"{receiver_user_id}__MUTUAL_MATCH__{key}"

    doc_ref = db.collection("notifications").document(doc_id)

    data = {
        "userId": receiver_user_id,
        "type": "MUTUAL_MATCH",
        "read": False,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "payload": {
            "otherUserId": other_user_id,
            "itemId": item_id,
            "mutualItemId": mutual_item_id,
            "matchKey": key,
        },
    }

    # set(..., merge=True) makes it safe if doc already exists
    doc_ref.set(data, merge=True)

    return {"id": doc_id, **data}
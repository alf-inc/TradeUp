from fastapi import HTTPException
from google.cloud.firestore_v1.base_query import FieldFilter


def check_match_only(db, liker_user_id: str, liked_item_id: str):
    """
    Read-only logic:
    Checks if liking an item creates any mutual matches.
    Does NOT write to Firestore.
    """

    # 1) Fetch the liked item
    liked_item_snap = db.collection("items").document(liked_item_id).get()
    if not liked_item_snap.exists:
        raise HTTPException(status_code=404, detail="Item not found")

    liked_item = liked_item_snap.to_dict()
    owner_user_id = liked_item.get("userId")

    # Safety: prevent self-matching
    if owner_user_id == liker_user_id:
        return {"matchFound": False, "matches": []}

    # 2) Fetch all items owned by the liker
    liker_items_stream = (
        db.collection("items")
        .where("userId", "==", liker_user_id)
        .stream()
    )

    liker_item_ids = [doc.id for doc in liker_items_stream]
    if not liker_item_ids:
        return {"matchFound": False, "matches": []}

    liker_item_set = set(liker_item_ids)

    # 3) Fetch the item owner's liked items
    owner_user_snap = db.collection("users").document(owner_user_id).get()
    if not owner_user_snap.exists:
        return {"matchFound": False, "matches": []}

    owner_likes = owner_user_snap.to_dict().get("liked_items", [])
    if not owner_likes:
        return {"matchFound": False, "matches": []}

    # 4) Find mutual likes
    mutual_item_ids = [
        item_id for item_id in owner_likes if item_id in liker_item_set
    ]

    # 4b) Exclude items already in completed trades
    traded_item_ids = set()

    q1 = db.collection("completed_trades").where(filter=FieldFilter("user1_id", "==", liker_user_id)).stream()
    q2 = db.collection("completed_trades").where(filter=FieldFilter("user2_id", "==", liker_user_id)).stream()
    for snap in list(q1) + list(q2):
        d = snap.to_dict()
        traded_item_ids.add(d.get("item1_id"))
        traded_item_ids.add(d.get("item2_id"))

    q3 = db.collection("completed_trades").where(filter=FieldFilter("user1_id", "==", owner_user_id)).stream()
    q4 = db.collection("completed_trades").where(filter=FieldFilter("user2_id", "==", owner_user_id)).stream()
    for snap in list(q3) + list(q4):
        d = snap.to_dict()
        traded_item_ids.add(d.get("item1_id"))
        traded_item_ids.add(d.get("item2_id"))

    # Skip if the liked item itself has been traded
    if liked_item_id in traded_item_ids:
        return {"matchFound": False, "matches": []}

    # Remove traded items from mutual matches
    mutual_item_ids = [mid for mid in mutual_item_ids if mid not in traded_item_ids]

    # 5) Build response with enriched item details
    matches = []
    for item_id in mutual_item_ids:
        item_a_snap = db.collection("items").document(item_id).get()
        item_a = item_a_snap.to_dict() if item_a_snap.exists else {}

        matches.append({
            "userA": liker_user_id,
            "userB": owner_user_id,
            "itemA": item_id,
            "itemATitle": item_a.get("title", ""),
            "itemAImage": item_a.get("imageUrl", ""),
            "itemACategory": item_a.get("category", ""),
            "itemB": liked_item_id,
            "itemBTitle": liked_item.get("title", ""),
            "itemBImage": liked_item.get("imageUrl", ""),
            "itemBCategory": liked_item.get("category", ""),
        })

    return {"matchFound": len(matches) > 0, "matches": matches}
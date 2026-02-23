from fastapi import HTTPException


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
        return {"matches": []}

    # 2) Fetch all items owned by the liker
    liker_items_stream = (
        db.collection("items")
        .where("userId", "==", liker_user_id)
        .stream()
    )

    liker_item_ids = [doc.id for doc in liker_items_stream]
    if not liker_item_ids:
        return {"matches": []}

    liker_item_set = set(liker_item_ids)

    # 3) Fetch the item owner's liked items
    owner_user_snap = db.collection("users").document(owner_user_id).get()
    if not owner_user_snap.exists:
        return {"matches": []}

    owner_likes = owner_user_snap.to_dict().get("liked_items", [])

    # 4) Find mutual likes
    mutual_item_ids = [
        item_id for item_id in owner_likes if item_id in liker_item_set
    ]

    # 5) Build response
    matches = [
        {
            "userA": liker_user_id,
            "userB": owner_user_id,
            "itemA": item_id,
            "itemB": liked_item_id
        }
        for item_id in mutual_item_ids
    ]

    return {"matches": matches}
from fastapi import HTTPException
from google.cloud.firestore_v1 import SERVER_TIMESTAMP


def toggle_saved_listing(db, user_id: str, listing_id: str):
    # Validate listing exists
    listing_snap = db.collection("items").document(listing_id).get()
    if not listing_snap.exists:
        raise HTTPException(status_code=404, detail="Listing not found")

    doc_id = f"{user_id}_{listing_id}"
    doc_ref = db.collection("saved_listings").document(doc_id)
    doc_snap = doc_ref.get()

    if doc_snap.exists:
        doc_ref.delete()
        return {"saved": False, "userId": user_id, "listingId": listing_id}

    doc_ref.set({
        "userId": user_id,
        "listingId": listing_id,
        "savedAt": SERVER_TIMESTAMP,
    })
    return {"saved": True, "userId": user_id, "listingId": listing_id}


def get_saved_listings(db, user_id: str):
    saved_docs = list(
        db.collection("saved_listings")
        .where("userId", "==", user_id)
        .stream()
    )
    saved_docs.sort(key=lambda d: d.to_dict().get("savedAt") or "", reverse=True)

    saved_listings = []
    for doc in saved_docs:
        data = doc.to_dict()
        listing_id = data.get("listingId")

        item_snap = db.collection("items").document(listing_id).get()
        if not item_snap.exists:
            continue

        item = item_snap.to_dict()
        saved_at = data.get("savedAt")

        saved_listings.append({
            "listingId": listing_id,
            "title": item.get("title", ""),
            "description": item.get("description", ""),
            "imageUrls": item.get("imageUrls", []),
            "category": item.get("category", ""),
            "condition": item.get("condition", ""),
            "userId": item.get("userId", ""),
            "userName": item.get("userName", ""),
            "userAvatar": item.get("userAvatar", ""),
            "savedAt": saved_at.isoformat() if saved_at else None,
        })

    return {"savedListings": saved_listings}

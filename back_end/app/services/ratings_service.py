from fastapi import HTTPException
import time

def submit_rating(db, trade_id: str, rater_user_id: str, score: float):
    # validate score
    if score < 1 or score > 5:
        raise HTTPException(status_code=400, detail="Score must be between 1 and 5")

    trade_ref = db.collection("completed_trades").document(trade_id)
    trade_snap = trade_ref.get()

    if not trade_snap.exists:
        raise HTTPException(status_code=404, detail="Trade not found")

    trade = trade_snap.to_dict()
    user1 = trade.get("user1_id")
    user2 = trade.get("user2_id")

    if rater_user_id not in (user1, user2):
        raise HTTPException(status_code=403, detail="User is not a participant in this trade")

    # decide which field to set
    if rater_user_id == user1:
        field = "user1_rating"
    else:
        field = "user2_rating"

    # prevent double rating
    if trade.get(field) is not None:
        raise HTTPException(status_code=400, detail="User has already rated this trade")

    trade_ref.update({
        field: float(score),
        "last_rating_at": int(time.time())
    })

    return {"ok": True}
    
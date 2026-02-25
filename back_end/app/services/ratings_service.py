from fastapi import HTTPException
import time
from google.cloud.firestore_v1.base_query import FieldFilter


def _compute_user_rating_stats(db, user_id: str):
    """
    Recompute a user's received-rating average from completed trades.
    """
    q1 = (
        db.collection("completed_trades")
        .where(filter=FieldFilter("user1_id", "==", user_id))
        .stream()
    )
    q2 = (
        db.collection("completed_trades")
        .where(filter=FieldFilter("user2_id", "==", user_id))
        .stream()
    )

    rating_total = 0.0
    ratings_received_count = 0
    completed_trade_count = 0

    for snap in list(q1) + list(q2):
        trade = snap.to_dict() or {}
        completed_trade_count += 1

        if trade.get("user1_id") == user_id:
            # user1_rating stores user1's received score
            received_rating = trade.get("user1_rating")
        elif trade.get("user2_id") == user_id:
            # user2_rating stores user2's received score
            received_rating = trade.get("user2_rating")
        else:
            continue

        if received_rating is None:
            continue

        try:
            rating_total += float(received_rating)
            ratings_received_count += 1
        except (TypeError, ValueError):
            continue

    average_rating = (
        round(rating_total / ratings_received_count, 2)
        if ratings_received_count > 0
        else 0.0
    )

    return average_rating, ratings_received_count, completed_trade_count


def _recompute_and_save_user_profile_rating(db, user_id: str):
    average_rating, ratings_received_count, completed_trade_count = _compute_user_rating_stats(
        db, user_id
    )

    db.collection("users").document(user_id).set(
        {
            "average_rating": average_rating,
            "ratings_received_count": ratings_received_count,
            "completed_trade_count": completed_trade_count,
            "last_rating_updated_at": int(time.time()),
        },
        merge=True,
    )

    return {
        "userId": user_id,
        "averageRating": average_rating,
        "ratingsReceivedCount": ratings_received_count,
        "completedTradeCount": completed_trade_count,
    }


def submit_rating(db, trade_id: str, rater_user_id: str, score: float):
    # validate score
    if score < 0 or score > 10:
        raise HTTPException(status_code=400, detail="Score must be between 1 and 10")

    trade_ref = db.collection("completed_trades").document(trade_id)
    trade_snap = trade_ref.get()

    if not trade_snap.exists:
        raise HTTPException(status_code=404, detail="Trade not found")

    trade = trade_snap.to_dict()
    user1 = trade.get("user1_id")
    user2 = trade.get("user2_id")

    if not user1 or not user2:
        raise HTTPException(status_code=400, detail="Trade participants are invalid")

    if rater_user_id not in (user1, user2):
        raise HTTPException(status_code=403, detail="User is not a participant in this trade")

    # userX_rating stores that user's received score.
    # So a rater writes into the OTHER participant's rating field.
    if rater_user_id == user1:
        field = "user2_rating"
        rated_user_id = user2
    else:
        field = "user1_rating"
        rated_user_id = user1

    if not rated_user_id:
        raise HTTPException(status_code=400, detail="Trade participants are invalid")

    previous_score = trade.get(field)

    trade_ref.update({
        field: float(score),
        "last_rating_at": int(time.time()),
        f"{field}_updated_at": int(time.time()),
    })

    # Recompute both users independently for this confirmed trade pair.
    # Each user's profile rating is based only on ratings they received.
    user1_stats = _recompute_and_save_user_profile_rating(db, user1)
    user2_stats = _recompute_and_save_user_profile_rating(db, user2)

    rated_user_stats = user1_stats if rated_user_id == user1 else user2_stats

    return {
        "ok": True,
        "edited": previous_score is not None,
        "previousScore": previous_score,
        "newScore": float(score),
        "ratedUserId": rated_user_id,
        "averageRating": rated_user_stats["averageRating"],
        "ratingsReceivedCount": rated_user_stats["ratingsReceivedCount"],
        "completedTradeCount": rated_user_stats["completedTradeCount"],
        "user1ProfileRating": user1_stats,
        "user2ProfileRating": user2_stats,
    }

from typing import Dict, Any
from app.services.match_checker import check_match_only
from app.services.notification_service import create_mutual_match_notification

def check_match_and_notify(db, liker_user_id: str, liked_item_id: str) -> Dict[str, Any]:
    """
    Checks mutual matches and writes notifications for both users.
    """
    result = check_match_only(db, liker_user_id, liked_item_id)
    matches = result.get("matches", [])

    written = []

    for m in matches:
        # m has: userA, userB, itemA, itemB  (see match_checker.py)
        userA = m["userA"]  # liker
        userB = m["userB"]  # owner of liked item
        itemA = m["itemA"]  # liker-owned item that owner liked
        itemB = m["itemB"]  # liked item

        # Notify A: "you matched with B"
        written.append(
            create_mutual_match_notification(
                db,
                receiver_user_id=userA,
                other_user_id=userB,
                item_id=itemB,          # the item A liked
                mutual_item_id=itemA,   # the item B liked
            )
        )

        # Notify B: "you matched with A"
        written.append(
            create_mutual_match_notification(
                db,
                receiver_user_id=userB,
                other_user_id=userA,
                item_id=itemA,          # the item B liked
                mutual_item_id=itemB,   # the item A liked
            )
        )

    return {"matches": matches, "notifications_written": len(written)}
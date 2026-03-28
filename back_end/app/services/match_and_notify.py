from typing import Dict, Any
from app.services.match_checker import check_match_only

def check_match_and_notify(db, liker_user_id: str, liked_item_id: str) -> Dict[str, Any]:
    """
    Checks mutual matches and returns them.
    Notifications are created later when the user creates an offer.
    """
    return check_match_only(db, liker_user_id, liked_item_id)

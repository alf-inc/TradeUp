# back_end/app/routes/trades.py

from fastapi import APIRouter
from app.core.firebase import db
from app.services.trades_service import confirm_if_both_accepted, get_trade_history_for_user, reject_trade_service

router = APIRouter(prefix="/trades", tags=["trades"])

@router.post("/confirm")
def confirm_trade(notificationId: str):
    """
    Call this after a user clicks ACCEPT.
    If both sides accepted, it writes to completed_trades.
    """
    return confirm_if_both_accepted(db, notificationId)

@router.post("/reject")
def reject_trade(notificationId: str):
    """
    Call this when the responder clicks Reject.
    Marks both notifications as rejected and writes a rejected trade record.
    """
    return reject_trade_service(db, notificationId)

@router.get("/history")
def trade_history(userId: str):
    """
    Returns completed_trades for a user.
    """
    return get_trade_history_for_user(db, userId)
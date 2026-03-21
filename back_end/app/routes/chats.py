from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel

from app.core.firebase import db
from app.services.chat_service import (
    initiate_chat,
    send_message,
    get_chat_messages,
    get_user_chats,
    verify_user_in_chat,
)
from app.services.chat_manager import manager

router = APIRouter(prefix="/chats", tags=["chats"])


class ChatInitiateRequest(BaseModel):
    currentUserId: str
    likedItemId: str
    mutualItemId: str
    notificationId: str


class SendMessageRequest(BaseModel):
    senderId: str
    message: str


@router.post("/initiate")
def create_or_get_chat(payload: ChatInitiateRequest):
    return initiate_chat(
        db=db,
        current_user_id=payload.currentUserId,
        liked_item_id=payload.likedItemId,
        mutual_item_id=payload.mutualItemId,
        notification_id=payload.notificationId,
    )


@router.get("")
def list_user_chats(userId: str):
    return {"chats": get_user_chats(db, userId)}


@router.get("/{chat_id}/messages")
def fetch_chat_messages(chat_id: str, userId: str):
    messages = get_chat_messages(db, chat_id, userId)
    return {"chatId": chat_id, "messages": messages}


@router.post("/{chat_id}/messages")
def create_message(chat_id: str, payload: SendMessageRequest):
    result = send_message(
        db=db,
        chat_id=chat_id,
        sender_id=payload.senderId,
        message_text=payload.message,
    )
    return result


@router.websocket("/ws/{chat_id}")
async def chat_websocket(websocket: WebSocket, chat_id: str, userId: Optional[str] = None):
    if not userId:
        await websocket.close(code=1008)
        return

    try:
        verify_user_in_chat(db, chat_id, userId)
    except HTTPException:
        await websocket.close(code=1008)
        return

    await manager.connect(chat_id, userId, websocket)

    try:
        while True:
            data = await websocket.receive_json()

            sender_id = data.get("senderId")
            message_text = data.get("message", "")

            if sender_id != userId:
                await websocket.send_json({"error": "senderId does not match connected user"})
                continue

            saved_message = send_message(
                db=db,
                chat_id=chat_id,
                sender_id=sender_id,
                message_text=message_text,
            )

            await manager.send_to_chat(chat_id, saved_message)

    except WebSocketDisconnect:
        manager.disconnect(chat_id, userId)
    except Exception:
        manager.disconnect(chat_id, userId)
        try:
            await websocket.close()
        except Exception:
            pass
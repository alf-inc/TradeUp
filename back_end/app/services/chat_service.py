from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from firebase_admin import firestore

from app.services.match_checker import check_match_only

def _format_timestamp(ts):
    if not ts:
        return None
    try:
        return ts.isoformat()
    except AttributeError:
        return str(ts)

def _build_participants_key(user_a: str, user_b: str) -> str:
    participants = sorted([user_a, user_b])
    return f"{participants[0]}__{participants[1]}"


def _get_item_owner_id(db, item_id: str) -> str:
    item_snap = db.collection("items").document(item_id).get()
    if not item_snap.exists:
        raise HTTPException(status_code=404, detail="Item not found")

    item_data = item_snap.to_dict()
    owner_user_id = item_data.get("userId")
    if not owner_user_id:
        raise HTTPException(status_code=400, detail="Item owner not found")

    return owner_user_id


def _build_item_pair_key(item_a: str, item_b: str) -> str:
    items = sorted([item_a, item_b])
    return f"{items[0]}__{items[1]}"


def initiate_chat(db, current_user_id: str, liked_item_id: str, mutual_item_id: str, notification_id: str) -> Dict[str, Any]:
    """
    Create or return an existing chat for a specific item-pair match.
    Uses a composite key of sorted(users) + sorted(items) so both users
    independently resolve to the same chat document.
    """

    target_user_id = _get_item_owner_id(db, liked_item_id)

    if current_user_id == target_user_id:
        raise HTTPException(status_code=400, detail="Cannot start chat with yourself")

    # Reuse your existing mutual match logic
    result = check_match_only(db, current_user_id, liked_item_id)
    matches = result.get("matches", [])

    if not matches:
        raise HTTPException(status_code=403, detail="Users are not a mutual match")

    participants = sorted([current_user_id, target_user_id])
    participants_key = _build_participants_key(current_user_id, target_user_id)
    item_pair_key = _build_item_pair_key(liked_item_id, mutual_item_id)
    # Composite key: unique per user-pair AND item-pair
    composite_key = f"{participants_key}__{item_pair_key}"

    existing_stream = (
        db.collection("chats")
        .where("compositeKey", "==", composite_key)
        .limit(1)
        .stream()
    )

    existing_docs = list(existing_stream)
    if existing_docs:
        doc = existing_docs[0]
        data = doc.to_dict()
        return {
            "chatId": doc.id,
            "participants": data.get("participants", participants),
            "notificationId": data.get("notificationId", notification_id),
            "createdAt": data.get("createdAt"),
            "existing": True,
        }

    chat_data = {
        "participants": participants,
        "participantsKey": participants_key,
        "compositeKey": composite_key,
        "notificationId": notification_id,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "lastMessage": "",
        "lastMessageAt": None,
    }

    chat_ref = db.collection("chats").document()
    chat_ref.set(chat_data)

    return {
        "chatId": chat_ref.id,
        "participants": participants,
        "existing": False,
    }


def _get_chat_or_404(db, chat_id: str):
    chat_ref = db.collection("chats").document(chat_id)
    chat_snap = chat_ref.get()

    if not chat_snap.exists:
        raise HTTPException(status_code=404, detail="Chat not found")

    return chat_ref, chat_snap.to_dict()


def verify_user_in_chat(db, chat_id: str, user_id: str) -> Dict[str, Any]:
    _, chat_data = _get_chat_or_404(db, chat_id)
    participants = chat_data.get("participants", [])

    if user_id not in participants:
        raise HTTPException(status_code=403, detail="User is not a participant in this chat")

    return chat_data


def send_message(db, chat_id: str, sender_id: str, message_text: str) -> Dict[str, Any]:
    if not message_text or not message_text.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    chat_ref, chat_data = _get_chat_or_404(db, chat_id)
    participants = chat_data.get("participants", [])

    if sender_id not in participants:
        raise HTTPException(status_code=403, detail="User is not a participant in this chat")

    receiver_id = None
    for p in participants:
        if p != sender_id:
            receiver_id = p
            break

    msg_ref = chat_ref.collection("messages").document()
    msg_data = {
        "chatId": chat_id,
        "senderId": sender_id,
        "receiverId": receiver_id,
        "message": message_text.strip(),
        "timestamp": firestore.SERVER_TIMESTAMP,
        "type": "text",
    }
    msg_ref.set(msg_data)

    chat_ref.update({
        "lastMessage": message_text.strip(),
        "lastMessageAt": firestore.SERVER_TIMESTAMP,
    })

    saved_snap = msg_ref.get()
    saved_data = saved_snap.to_dict() or {}

    return {
        "messageId": msg_ref.id,
        "chatId": chat_id,
        "senderId": sender_id,
        "receiverId": receiver_id,
        "message": saved_data.get("message", message_text.strip()),
        "timestamp": _format_timestamp(saved_data.get("timestamp")), 
        "type": saved_data.get("type", "text"),
    }

def get_chat_messages(db, chat_id: str, user_id: str) -> List[Dict[str, Any]]:
    verify_user_in_chat(db, chat_id, user_id)

    messages_stream = (
        db.collection("chats")
        .document(chat_id)
        .collection("messages")
        .order_by("timestamp")
        .stream()
    )

    messages = []
    for doc in messages_stream:
        data = doc.to_dict()
        messages.append({
            "messageId": doc.id,
            "chatId": data.get("chatId"),
            "senderId": data.get("senderId"),
            "receiverId": data.get("receiverId"),
            "message": data.get("message"),
            "timestamp": _format_timestamp(data.get("timestamp")),
            "type": data.get("type", "text"),
        })

    return messages


def find_chat_by_trade(db, user_id: str, user1_id: str, user2_id: str, item1_id: str, item2_id: str) -> Optional[Dict[str, Any]]:
    """
    Look up an existing chat for a completed trade using the same composite key logic.
    Returns {"chatId": "..."} or None if no chat exists.
    """
    if user_id not in (user1_id, user2_id):
        raise HTTPException(status_code=403, detail="User is not a participant in this trade")

    participants_key = _build_participants_key(user1_id, user2_id)
    item_pair_key = _build_item_pair_key(item1_id, item2_id)
    composite_key = f"{participants_key}__{item_pair_key}"

    docs = list(
        db.collection("chats")
        .where("compositeKey", "==", composite_key)
        .limit(1)
        .stream()
    )

    if not docs:
        return None

    return {"chatId": docs[0].id}


def get_user_chats(db, user_id: str) -> List[Dict[str, Any]]:
    chats_stream = (
        db.collection("chats")
        .where("participants", "array_contains", user_id)
        .stream()
    )

    chats = []
    for doc in chats_stream:
        data = doc.to_dict()
        chats.append({
            "chatId": doc.id,
            "participants": data.get("participants", []),
            "notificationId": data.get("notificationId", ""),
            "createdAt": _format_timestamp(data.get("createdAt")),
            "lastMessage": data.get("lastMessage", ""),
            "lastMessageAt": _format_timestamp(data.get("lastMessageAt")),
        })

    return chats
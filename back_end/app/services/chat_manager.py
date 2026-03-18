from collections import defaultdict
from fastapi import WebSocket
from typing import Dict


class ConnectionManager:
    def __init__(self):
        # chat_id -> { user_id: websocket }
        self.active_connections: Dict[str, Dict[str, WebSocket]] = defaultdict(dict)

    async def connect(self, chat_id: str, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[chat_id][user_id] = websocket

    def disconnect(self, chat_id: str, user_id: str):
        if chat_id in self.active_connections and user_id in self.active_connections[chat_id]:
            del self.active_connections[chat_id][user_id]

        if chat_id in self.active_connections and not self.active_connections[chat_id]:
            del self.active_connections[chat_id]

    async def send_to_chat(self, chat_id: str, message: dict):
        if chat_id not in self.active_connections:
            return

        dead_users = []

        for user_id, websocket in self.active_connections[chat_id].items():
            try:
                await websocket.send_json(message)
            except Exception:
                dead_users.append(user_id)

        for user_id in dead_users:
            self.disconnect(chat_id, user_id)


manager = ConnectionManager()
from asgiref.sync import sync_to_async
from django.utils import timezone

from websocket.consumers.base import BaseConsumer
from community.models import (
    PrivateConversation,
    PrivateConversationMember,
    PrivateMessage,
)

class PrivateChatConsumer(BaseConsumer):
    async def connect(self):
        user = self.scope.get("user")

        print("USER:", user)
        print("AUTH:", user.is_authenticated)
        print("COOKIES:", self.scope.get("cookies"))

        print("PrivateChatConsumer.connect user:", self.scope.get("user"))
        print("authenticated:", self.scope.get("user").is_authenticated)
        print("cookies keys:", list(self.scope.get("cookies", {}).keys()) or "none")

        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.conversation_id = self.scope["url_route"]["kwargs"].get("conversation_id")
        if not self.conversation_id:
            await self.close(code=4002)
            return

        ok = await self._can_join_conversation(
            user_id=user.id,
            convo_id=self.conversation_id,
        )
        if not ok:
            await self.close(code=4003)
            return

        self.user = user
        self.room = f"private_chat_{self.conversation_id}"

        await self.channel_layer.group_add(self.room, self.channel_name)
        await self.accept()

        await self.send_json({"type": "ws:ready", "payload": {"ok": True}})

    async def disconnect(self, close_code):
        try:
            if hasattr(self, "room"):
                await self.channel_layer.group_discard(self.room, self.channel_name)
        except Exception:
            pass

    # =========================
    # ✅ RECEIVE EVENTS
    # =========================
    async def receive_json(self, content, **kwargs):
        event_type = content.get("type")
        payload = content.get("payload") or {}

        if event_type == "ping":
            await self.send_json({"type": "pong", "payload": {"t": timezone.now().isoformat()}})
            return

        if event_type == "message:send":
            await self.handle_send_message(payload)
            return

        await self.send_error(f"Unknown type: {event_type}")

    # =========================
    # ✅ SEND MESSAGE (WS ONLY)
    # =========================
    async def handle_send_message(self, payload: dict):
        """
        payload example:
        {
          "clientTempId": "tmp-123",
          "text": "hello",
          "messageType": "TEXT"
        }
        """

        client_temp_id = payload.get("clientTempId")
        text = (payload.get("text") or "").strip()

        if not client_temp_id:
            await self.send_error("Missing clientTempId")
            return

        if not text:
            await self.send_error("Message cannot be empty")
            return

        # ✅ Save to DB
        msg = await self._create_message(
            convo_id=self.conversation_id,
            sender_id=self.user.id,
            text=text,
            client_temp_id=client_temp_id,
        )

        # ✅ build payload once
        message_payload = {
            "id": str(msg["id"]),
            "clientTempId": client_temp_id,
            "conversationId": str(self.conversation_id),
            "messageType": "TEXT",
            "text": msg["text"],
            "sender": {"id": str(self.user.id), "name": msg["sender_name"]},
            "createdAt": msg["created_at"],
            "deletedAt": None,
            "editedAt": None,
            "attachments": [],
            "reactions": [],
            "myReaction": None,
            "replyTo": None,
        }

        # ✅ 1) ACK to sender only (replace optimistic)
        await self.send_json({"type": "message:ack", "payload": message_payload})

        # ✅ 2) Broadcast to everyone EXCEPT sender
        await self.channel_layer.group_send(
            self.room,
            {
                "type": "broadcast",
                "payload": {"type": "message:new", "payload": message_payload},
                "sender": self.channel_name,  # ✅ used to skip echo
            },
        )

    async def broadcast(self, event):
        payload = event.get("payload")
        sender = event.get("sender")

        # ✅ do not echo back to sender (Socket.io broadcast style)
        if sender and sender == self.channel_name:
            return

        if payload:
            await self.send_json(payload)

    # =========================
    # ✅ DB HELPERS
    # =========================

    @staticmethod
    @sync_to_async
    def _can_join_conversation(user_id, convo_id) -> bool:
        return (
            PrivateConversation.objects.filter(id=convo_id, is_active=True).exists()
            and PrivateConversationMember.objects.filter(conversation_id=convo_id, user_id=user_id).exists()
        )

    @staticmethod
    @sync_to_async
    def _create_message(convo_id, sender_id, text, client_temp_id):
        convo = PrivateConversation.objects.get(id=convo_id)

        msg = PrivateMessage.objects.create(
            conversation=convo,
            sender_id=sender_id,
            text=text,
            # ✅ if you have this column:
            # client_temp_id=client_temp_id,
        )

        sender = msg.sender

        return {
            "id": msg.id,
            "text": msg.text,
            "created_at": msg.created_at.isoformat(),
            "sender_name": sender.full_name or sender.username,
        }

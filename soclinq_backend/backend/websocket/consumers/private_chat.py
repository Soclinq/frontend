from asgiref.sync import sync_to_async
from django.utils import timezone

from websocket.consumers.base import BaseConsumer
from community.models import (
    PrivateConversation,
    PrivateConversationMember,
    PrivateMessage,
    PrivateMessageReceipt,
)


class PrivateChatConsumer(BaseConsumer):

    # =========================
    # CONNECT / DISCONNECT
    # =========================

    async def connect(self):
        user = self.scope.get("user")

        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user = user
        self.conversation_id = self.scope["url_route"]["kwargs"].get("conversation_id")

        if not self.conversation_id:
            await self.close(code=4002)
            return

        can_join = await self._can_join_conversation(
            user_id=self.user.id,
            convo_id=self.conversation_id,
        )

        if not can_join:
            await self.close(code=4003)
            return

        self.room = f"private_chat_{self.conversation_id}"

        await self.channel_layer.group_add(self.room, self.channel_name)
        await self.accept()

        await self.send_json({
            "type": "ws:ready",
            "payload": {"ok": True},
        })

    async def disconnect(self, close_code):
        if hasattr(self, "room"):
            await self.channel_layer.group_discard(self.room, self.channel_name)

    # =========================
    # RECEIVE EVENTS
    # =========================

    async def receive_json(self, content, **kwargs):
        event_type = content.get("type")
        payload = content.get("payload") or {}

        if event_type == "ping":
            await self.send_json({
                "type": "pong",
                "payload": {"t": timezone.now().isoformat()},
            })
            return

        if event_type == "message:send":
            await self.handle_send_message(payload)
            return

        if event_type == "message:delivered":
            await self.handle_delivered(payload)
            return

        if event_type == "message:seen":
            await self.handle_seen(payload)
            return

        await self.send_error(f"Unknown type: {event_type}")

    # =========================
    # MESSAGE SEND
    # =========================

    async def handle_send_message(self, payload: dict):
        client_temp_id = payload.get("clientTempId")
        text = (payload.get("text") or "").strip()

        if not client_temp_id:
            await self.send_error("Missing clientTempId")
            return

        if not text:
            await self.send_error("Message cannot be empty")
            return

        msg = await self._create_message(
            convo_id=self.conversation_id,
            sender_id=self.user.id,
            text=text,
            client_temp_id=client_temp_id,
        )

        message_payload = {
            "id": str(msg["id"]),
            "clientTempId": client_temp_id,
            "messageType": "TEXT",
            "text": msg["text"],
            "sender": {
                "id": str(self.user.id),
                "name": msg["sender_name"],
            },
            "createdAt": msg["created_at"],
            "deletedAt": None,
            "editedAt": None,
            "attachments": [],
            "reactions": [],
            "myReaction": None,
            "replyTo": None,
        }

        # ACK → sender only
        await self.send_json({
            "type": "message:ack",
            "payload": message_payload,
        })

        # Broadcast → others
        await self.channel_layer.group_send(
            self.room,
            {
                "type": "broadcast",
                "payload": {
                    "type": "message:new",
                    "payload": message_payload,
                },
                "sender": self.channel_name,
            },
        )

    # =========================
    # DELIVERY RECEIPT
    # =========================

    async def handle_delivered(self, payload: dict):
        message_id = payload.get("messageId")

        if not message_id:
            await self.send_error("Missing messageId")
            return

        changed = await self._mark_delivered(
            message_id=message_id,
            user_id=self.user.id,
        )

        if not changed:
            return

        await self.channel_layer.group_send(
            self.room,
            {
                "type": "broadcast",
                "payload": {
                    "type": "message:delivered",
                    "payload": {"messageId": str(message_id)},
                },
                "sender": None,
            },
        )

    # =========================
    # READ RECEIPT
    # =========================

    async def handle_seen(self, payload: dict):
        message_id = payload.get("messageId")

        if not message_id:
            await self.send_error("Missing messageId")
            return

        changed = await self._mark_seen(
            message_id=message_id,
            user_id=self.user.id,
            convo_id=self.conversation_id,
        )

        if not changed:
            return

        await self.channel_layer.group_send(
            self.room,
            {
                "type": "broadcast",
                "payload": {
                    "type": "message:seen",
                    "payload": {
                        "messageId": str(message_id),
                        "userId": str(self.user.id),
                    },
                },
                "sender": None,
            },
        )

    # =========================
    # BROADCAST HANDLER
    # =========================

    async def broadcast(self, event):
        payload = event.get("payload")
        sender = event.get("sender")

        if sender and sender == self.channel_name:
            return

        if payload:
            await self.send_json(payload)

    # =========================
    # DB HELPERS
    # =========================

    @staticmethod
    @sync_to_async
    def _can_join_conversation(user_id, convo_id) -> bool:
        return (
            PrivateConversation.objects.filter(id=convo_id, is_active=True).exists()
            and PrivateConversationMember.objects.filter(
                conversation_id=convo_id,
                user_id=user_id,
            ).exists()
        )

    @staticmethod
    @sync_to_async
    def _create_message(convo_id, sender_id, text, client_temp_id):
        convo = PrivateConversation.objects.get(id=convo_id)

        msg = PrivateMessage.objects.create(
            conversation=convo,
            sender_id=sender_id,
            text=text,
            client_temp_id=client_temp_id,
        )

        sender = msg.sender

        return {
            "id": msg.id,
            "text": msg.text,
            "created_at": msg.created_at.isoformat(),
            "sender_name": sender.full_name or sender.username,
        }

    @staticmethod
    @sync_to_async
    def _mark_delivered(message_id: str, user_id: int) -> bool:
        msg = PrivateMessage.objects.filter(id=message_id).first()
        if not msg:
            return False

        if msg.sender_id == user_id:
            return False

        now = timezone.now()

        receipt, _ = PrivateMessageReceipt.objects.get_or_create(
            message_id=msg.id,
            user_id=user_id,
        )

        if receipt.delivered_at:
            return False

        receipt.delivered_at = now
        receipt.save(update_fields=["delivered_at"])

        PrivateConversationMember.objects.filter(
            conversation_id=msg.conversation_id,
            user_id=user_id,
        ).update(last_delivered_at=now)

        return True

    @staticmethod
    @sync_to_async
    def _mark_seen(message_id: str, user_id: int, convo_id: str) -> bool:
        msg = PrivateMessage.objects.filter(
            id=message_id,
            conversation_id=convo_id,
        ).first()

        if not msg:
            return False

        if msg.sender_id == user_id:
            return False

        now = timezone.now()

        receipt, _ = PrivateMessageReceipt.objects.get_or_create(
            message_id=msg.id,
            user_id=user_id,
        )

        changed = False

        if not receipt.delivered_at:
            receipt.delivered_at = now
            changed = True

        if not receipt.read_at:
            receipt.read_at = now
            changed = True

        if not changed:
            return False

        receipt.save()

        PrivateConversationMember.objects.filter(
            conversation_id=convo_id,
            user_id=user_id,
        ).update(
            last_read_at=now,
            last_delivered_at=now,
        )

        return True

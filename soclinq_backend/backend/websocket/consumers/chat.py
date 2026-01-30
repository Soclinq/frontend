from django.utils import timezone
from asgiref.sync import sync_to_async

from websocket.consumers.base import BaseConsumer
from websocket.events.broadcaster import chat_group_name

from community.models import CommunityHub, CommunityMembership


class ChatConsumer(BaseConsumer):
    """
    Chat websocket consumer.
    - Sender gets message:delivered (ACK)
    - Everyone else gets message:new
    - Prevents sender duplicate messages
    """

    async def connect(self):
        print("WS COOKIES:", self.scope.get("cookies"))
        print("WS USER:", self.scope.get("user"))
        user = self.scope.get("user")

        if not user or user.is_anonymous:
            await self.close(code=4001)
            return

        self.group_id = self.scope["url_route"]["kwargs"]["group_id"]
        if not self.group_id:
            await self.close(code=4002)
            return

        # ✅ Ensure hub exists
        if not await self._hub_exists(self.group_id):
            await self.close(code=4004)
            return

        # ✅ Ensure membership
        if not await self._is_member(user.id, self.group_id):
            await self.close(code=4003)
            return

        self.room = f"chat_{self.group_id}"

        await self.channel_layer.group_add(self.room, self.channel_name)
        await self.accept()

        # ✅ presence update for others (skip sender)
        await self._broadcast_to_room(
            payload={
                "type": "presence:update",
                "payload": {
                    "userId": str(user.id),
                    "online": True,
                    "lastSeen": None,
                },
            },
            exclude_self=True,
        )

    async def disconnect(self, close_code):
        user = self.scope.get("user")

        if hasattr(self, "room"):
            await self.channel_layer.group_discard(self.room, self.channel_name)    

        if user and not user.is_anonymous and hasattr(self, "room"):
            await self._broadcast_to_room(
                payload={
                    "type": "presence:update",
                    "payload": {
                        "userId": str(user.id),
                        "online": False,
                        "lastSeen": timezone.now().isoformat(),
                    },
                },
                exclude_self=True,
            )

    async def receive_json(self, content, **kwargs):
        event_type = content.get("type")
        payload = content.get("payload") or {}

        if not event_type:
            await self.send_error("Missing event type")
            return

        if event_type == "message:send":
            await self.handle_message_send(payload)
            return

        if event_type == "typing:start":
            await self.handle_typing(is_typing=True)
            return

        if event_type == "typing:stop":
            await self.handle_typing(is_typing=False)
            return

        if event_type == "message:seen":
            await self.handle_seen(payload)
            return

        await self.send_error(f"Unknown event type: {event_type}")

    # ================= HANDLERS =================

    async def handle_message_send(self, payload: dict):
        """
        Realtime send should NOT broadcast final messages anymore.
        REST POST will create DB message and broadcast with real id.
        """

        temp_id = payload.get("tempId")
        text = (payload.get("text") or "").strip()

        if not text:
            await self.send_error("Message text is required")
            return

        # ✅ only ACK sender that socket received message
        await self.send_json(
            {
                "type": "message:delivered",
                "payload": {
                    "tempId": temp_id,
                    "messageId": temp_id,  # still temp at this stage
                },
            }
        )

    async def handle_typing(self, is_typing: bool):
        user = self.scope["user"]

        # ✅ typing event should NOT echo back to sender
        await self._broadcast_to_room(
            payload={
                "type": "typing:update",
                "payload": {
                    "user": {
                        "id": str(user.id),
                        "name": getattr(user, "full_name", None) or user.username,
                    },
                    "isTyping": is_typing,
                },
            },
            exclude_self=True,
        )

    async def handle_seen(self, payload: dict):
        user = self.scope["user"]

        message_id = payload.get("messageId")
        if not message_id:
            return

        await self._broadcast_to_room(
            payload={
                "type": "message:seen:update",
                "payload": {
                    "messageId": message_id,
                    "userId": str(user.id),
                },
            },
            exclude_self=True,
        )

    # ================= HELPERS =================

    async def _broadcast_to_room(self, payload: dict, exclude_self: bool = False):
        """
        Uses your BaseConsumer.broadcast() design.

        - group_send to room
        - BaseConsumer.broadcast forwards payload to client
        - If exclude_self=True, sender ignores message
        """

        await self.channel_layer.group_send(
            self.room,
            {
                "type": "broadcast",
                "payload": payload,
                "sender_channel": self.channel_name if exclude_self else None,
            },
        )

    async def broadcast(self, event):
        payload = event.get("payload")
        if not payload:
            return

        # ✅ Ignore if payload says exclude this sender id
        try:
            exclude_sender_id = payload.get("payload", {}).get("excludeSenderId")
            if exclude_sender_id and str(self.scope["user"].id) == str(exclude_sender_id):
                return
        except:
            pass

        await self.send_json(payload)


    # ================= DB CHECKS =================

    @staticmethod
    async def _hub_exists(hub_id: str) -> bool:
        return await sync_to_async(
            lambda: CommunityHub.objects.filter(id=hub_id, is_active=True).exists()
        )()

    @staticmethod
    async def _is_member(user_id: str, hub_id: str) -> bool:
        return await sync_to_async(
            lambda: CommunityMembership.objects.filter(
                user_id=user_id, hub_id=hub_id, is_active=True
            ).exists()
        )()

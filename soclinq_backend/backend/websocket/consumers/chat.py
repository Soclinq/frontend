import uuid
from django.utils import timezone
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.core.cache import cache

from community.models import (
    CommunityHub,
    CommunityMembership,
    HubMessage,
    HubMessageReceipt,
    HubReadReceipt,
)

PRESENCE_TTL_SECONDS = 45
TYPING_RATE_LIMIT_SECONDS = 1  # typing event max 1 per second (per user per hub)


def presence_key(hub_id: str, user_id: str) -> str:
    return f"presence:hub:{hub_id}:user:{user_id}"


def typing_rl_key(hub_id: str, user_id: str) -> str:
    return f"typing_rl:hub:{hub_id}:user:{user_id}"


class HubChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")

        if not user or user.is_anonymous:
            await self.close(code=4001)
            return

        self.hub_id = self.scope["url_route"]["kwargs"].get("hub_id")
        if not self.hub_id:
            await self.close(code=4002)
            return

        # ✅ validate hub + membership
        ok = await self._can_join_hub(user_id=user.id, hub_id=self.hub_id)
        if not ok:
            await self.close(code=4003)
            return

        self.user = user
        self.room = f"hub_chat_{self.hub_id}"

        await self.channel_layer.group_add(self.room, self.channel_name)
        await self.accept()

        # ✅ mark online in redis
        await self._set_presence_online()

        # ✅ broadcast presence to others
        await self.channel_layer.group_send(
            self.room,
            {
                "type": "broadcast",
                "payload": {
                    "type": "presence:update",
                    "payload": {
                        "userId": str(self.user.id),
                        "online": True,
                        "lastSeen": None,
                    },
                },
                "sender": self.channel_name,
            },
        )

        await self.send_json({"type": "ws:ready", "payload": {"ok": True}})

    async def disconnect(self, close_code):
        if hasattr(self, "room"):
            await self.channel_layer.group_discard(self.room, self.channel_name)

        if hasattr(self, "user") and self.user and not self.user.is_anonymous:
            await self._set_presence_offline()

            if hasattr(self, "room"):
                await self.channel_layer.group_send(
                    self.room,
                    {
                        "type": "broadcast",
                        "payload": {
                            "type": "presence:update",
                            "payload": {
                                "userId": str(self.user.id),
                                "online": False,
                                "lastSeen": timezone.now().isoformat(),
                            },
                        },
                        "sender": self.channel_name,
                    },
                )

    # =========================
    # ✅ RECEIVE EVENTS
    # =========================

    async def receive_json(self, content, **kwargs):
        event_type = content.get("type")
        payload = content.get("payload") or {}

        if not event_type:
            await self.send_json({"type": "ERROR", "message": "Missing type"})
            return

        if event_type == "ping":
            await self.handle_ping()
            return

        if event_type == "typing:update":
            await self.handle_typing(payload)
            return

        if event_type == "message:delivered":
            await self.handle_delivered(payload)
            return

        if event_type == "message:seen":
            await self.handle_seen(payload)
            return

        await self.send_json({"type": "ERROR", "message": f"Unknown type: {event_type}"})

    # =========================
    # ✅ HEARTBEAT
    # =========================

    async def handle_ping(self):
        # refresh online TTL
        await self._set_presence_online()

        await self.send_json(
            {"type": "pong", "payload": {"serverTime": timezone.now().isoformat()}}
        )

    # =========================
    # ✅ TYPING
    # =========================

    async def handle_typing(self, payload: dict):
        is_typing = bool(payload.get("isTyping"))
        name = payload.get("name") or getattr(self.user, "full_name", None) or self.user.username

        # ✅ rate limit typing spam
        allowed = await self._typing_allowed()
        if not allowed:
            return

        await self.channel_layer.group_send(
            self.room,
            {
                "type": "broadcast",
                "payload": {
                    "type": "typing:update",
                    "payload": {
                        "user": {
                            "id": str(self.user.id),
                            "name": name,
                        },
                        "isTyping": is_typing,
                    },
                },
                "sender": self.channel_name,
            },
        )

    # =========================
    # ✅ DELIVERED (per message)
    # =========================

    async def handle_delivered(self, payload: dict):
        message_id = payload.get("messageId")
        if not message_id:
            return

        ok = await self._mark_delivered(message_id=message_id, user_id=self.user.id)
        if not ok:
            return

        # broadcast to others (sender can update ticks)
        await self.channel_layer.group_send(
            self.room,
            {
                "type": "broadcast",
                "payload": {
                    "type": "message:delivered:update",
                    "payload": {
                        "messageId": str(message_id),
                        "userId": str(self.user.id),
                        "deliveredAt": timezone.now().isoformat(),
                    },
                },
                "sender": self.channel_name,
            },
        )

    # =========================
    # ✅ SEEN (read receipt)
    # =========================

    async def handle_seen(self, payload: dict):
        message_id = payload.get("messageId")
        if not message_id:
            return

        ok = await self._mark_seen(message_id=message_id, user_id=self.user.id, hub_id=self.hub_id)
        if not ok:
            return

        await self.channel_layer.group_send(
            self.room,
            {
                "type": "broadcast",
                "payload": {
                    "type": "message:seen:update",
                    "payload": {
                        "messageId": str(message_id),
                        "userId": str(self.user.id),
                        "readAt": timezone.now().isoformat(),
                    },
                },
                "sender": self.channel_name,
            },
        )

    # =========================
    # ✅ GROUP BROADCAST HANDLER
    # =========================

    async def broadcast(self, event):
        payload = event.get("payload")
        sender = event.get("sender")

        # ✅ don’t echo back to sender for presence/typing etc
        if sender and sender == self.channel_name:
            return

        if payload:
            await self.send_json(payload)

    # =========================
    # ✅ REDIS PRESENCE HELPERS
    # =========================

    @sync_to_async
    def _set_presence_online(self):
        cache.set(
            presence_key(str(self.hub_id), str(self.user.id)),
            {"online": True, "lastSeen": None, "updatedAt": timezone.now().isoformat()},
            timeout=PRESENCE_TTL_SECONDS,
        )

    @sync_to_async
    def _set_presence_offline(self):
        cache.set(
            presence_key(str(self.hub_id), str(self.user.id)),
            {
                "online": False,
                "lastSeen": timezone.now().isoformat(),
                "updatedAt": timezone.now().isoformat(),
            },
            timeout=PRESENCE_TTL_SECONDS,
        )

    @sync_to_async
    def _typing_allowed(self) -> bool:
        key = typing_rl_key(str(self.hub_id), str(self.user.id))
        if cache.get(key):
            return False
        cache.set(key, True, timeout=TYPING_RATE_LIMIT_SECONDS)
        return True

    # =========================
    # ✅ DB HELPERS
    # =========================

    @staticmethod
    @sync_to_async
    def _can_join_hub(user_id, hub_id) -> bool:
        return (
            CommunityHub.objects.filter(id=hub_id, is_active=True).exists()
            and CommunityMembership.objects.filter(user_id=user_id, hub_id=hub_id, is_active=True).exists()
        )

    @staticmethod
    @sync_to_async
    def _mark_delivered(message_id: str, user_id: int) -> bool:
        msg = HubMessage.objects.filter(id=message_id).first()
        if not msg:
            return False

        receipt, _ = HubMessageReceipt.objects.get_or_create(message_id=msg.id, user_id=user_id)

        if receipt.delivered_at is None:
            receipt.delivered_at = timezone.now()
            receipt.save(update_fields=["delivered_at"])

        return True

    @staticmethod
    @sync_to_async
    def _mark_seen(message_id: str, user_id: int, hub_id: str) -> bool:
        msg = HubMessage.objects.filter(id=message_id, hub_id=hub_id).first()
        if not msg:
            return False

        # ✅ per message receipt
        receipt, _ = HubMessageReceipt.objects.get_or_create(message_id=msg.id, user_id=user_id)

        now = timezone.now()
        changed = False

        if receipt.delivered_at is None:
            receipt.delivered_at = now
            changed = True

        if receipt.read_at is None:
            receipt.read_at = now
            changed = True

        if changed:
            receipt.save(update_fields=["delivered_at", "read_at"])

        # ✅ per hub last read
        hub_read, _ = HubReadReceipt.objects.get_or_create(user_id=user_id, hub_id=hub_id)
        hub_read.last_seen_message = msg
        hub_read.last_seen_at = now
        hub_read.save(update_fields=["last_seen_message", "last_seen_at"])

        # ✅ optional seen_by update
        msg.seen_by.add(user_id)

        return True

from websocket.auth import authenticate_ws
from .base import BaseConsumer


class StreamOwnerConsumer(BaseConsumer):
    """
    WebSocket consumer for stream owners (SOS initiators).
    Each user gets a private channel group.
    """

    async def connect(self):
        user = authenticate_ws(self.scope)

        if not user:
            await self.close(code=4001)
            return

        self.scope["user"] = user
        self.group_name = f"user_{user.id}"

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

from websocket.auth import authenticate_ws
from .base import BaseConsumer


class AdminConsumer(BaseConsumer):
    """
    WebSocket consumer for admins.
    Admins see everything.
    """

    GROUP_NAME = "admins"

    async def connect(self):
        user = authenticate_ws(self.scope)

        if not user:
            await self.close(code=4001)
            return

        if not user.is_staff:
            await self.close(code=4003)
            return

        self.scope["user"] = user

        await self.channel_layer.group_add(
            self.GROUP_NAME,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.GROUP_NAME,
            self.channel_name
        )

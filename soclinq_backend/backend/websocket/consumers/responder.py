from websocket.auth import authenticate_ws
from .base import BaseConsumer


class ResponderConsumer(BaseConsumer):
    """
    WebSocket consumer for responders.
    Responders receive:
    - New SOS streams
    - Severity updates
    - Stream ended events
    """

    GROUP_NAME = "responders"

    async def connect(self):
        user = authenticate_ws(self.scope)

        if not user:
            await self.close(code=4001)
            return

        if not getattr(user, "is_responder", False):
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

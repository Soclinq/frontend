from channels.generic.websocket import AsyncJsonWebsocketConsumer

class ResponderConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not user.is_authenticated or not user.is_responder:
            await self.close()
            return

        await self.channel_layer.group_add(
            "responders_global",
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            "responders_global",
            self.channel_name
        )

    async def push_event(self, event):
        await self.send_json(event["payload"])

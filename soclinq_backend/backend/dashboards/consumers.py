import json
from channels.generic.websocket import AsyncWebsocketConsumer


class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")

        if not user or not getattr(user, "is_authenticated", False):
            await self.close()
            return

        self.group_name = f"dashboard_{user?.role.lower()}"

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

    async def send_event(self, event):
        await self.send(text_data=json.dumps(event["data"]))

from channels.generic.websocket import AsyncJsonWebsocketConsumer


class BaseConsumer(AsyncJsonWebsocketConsumer):
    """
    Base consumer:
    - No business logic
    - Only responsible for sending events
    """

    async def broadcast(self, event):
        """
        Receive events from channel layer and send to client
        """
        payload = event.get("payload")
        if payload:
            await self.send_json(payload)

    async def send_error(self, message: str):
        await self.send_json({
            "type": "ERROR",
            "message": message,
        })

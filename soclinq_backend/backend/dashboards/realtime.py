from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer




def broadcast_to_role(role, data):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"dashboard_{role.lower()}",
        {
            "type": "send_event",
            "data": data,
        }
    )



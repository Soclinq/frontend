from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def notify_group(group_name: str, payload: dict, exclude_user_channel: str | None = None):
    """
    Send payload to a channels group.
    Uses BaseConsumer.broadcast() format.
    """
    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "broadcast",
            "payload": payload,
            "sender_channel": exclude_user_channel,
        },
    )

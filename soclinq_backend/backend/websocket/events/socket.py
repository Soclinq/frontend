from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def notify_group(group_id: str, payload: dict, exclude_user_channel: str | None = None):
    """
    Broadcast payload to a websocket chat group.
    Group naming MUST match the consumer group_add.
    """
    channel_layer = get_channel_layer()

    # ✅ Valid group name for Channels (no slashes, no spaces, < 100 chars)
    group_name = f"chat_{group_id}"

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "broadcast",
            "payload": payload,
            "sender_channel": exclude_user_channel,
        },
    )

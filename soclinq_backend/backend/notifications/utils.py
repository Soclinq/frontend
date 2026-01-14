from .models import Notification
from audit.utils import log_action


def send_notification(
    *,
    recipient,
    notification_type,
    title,
    message,
    metadata=None,
    request=None,
):
    notification = Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        metadata=metadata or {},
    )

    log_action(
        user=recipient,
        action="CREATE",
        request=request,
        object_type="Notification",
        object_id=notification.id,
    )

    return notification

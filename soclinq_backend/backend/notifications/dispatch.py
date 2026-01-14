from community.models import CommunityMembership
from .utils import send_notification
from .models import NotificationType


def notify_hub_members(
    *,
    hub,
    title,
    message,
    notification_type,
    exclude_user=None,
    request=None,
):
    memberships = CommunityMembership.objects.filter(
        hub=hub,
        is_active=True
    ).select_related("user")

    for membership in memberships:
        if exclude_user and membership.user == exclude_user:
            continue

        send_notification(
            recipient=membership.user,
            notification_type=notification_type,
            title=title,
            message=message,
            request=request,
        )

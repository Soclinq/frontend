from .models import AuditLog


def log_action(
    *,
    user=None,
    action,
    request=None,
    object_type="",
    object_id="",
    was_successful=True,
    metadata=None,
):
    ip_address = None
    user_agent = ""

    if request:
        ip_address = request.META.get("REMOTE_ADDR")
        user_agent = request.META.get("HTTP_USER_AGENT", "")
    print(str(metadata))
    AuditLog.objects.create(
        user=user,
        action=action,
        object_type=object_type,
        object_id=str(object_id),
        ip_address=ip_address,
        user_agent=user_agent,
        was_successful=was_successful,
        metadata=metadata or {},
    )

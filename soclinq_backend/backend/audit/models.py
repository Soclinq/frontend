import uuid
from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class AuditLog(models.Model):
    ACTION_CHOICES = [
        # Core system
        ("CREATE", "Create"),
        ("UPDATE", "Update"),
        ("DELETE", "Delete"),
        ("VIEW", "View"),

        # Auth
        ("LOGIN", "Login"),
        ("LOGOUT", "Logout"),
        ("OTP_VERIFY", "OTP Verify"),

        # Admin / Security
        ("SUSPEND", "Suspend"),
        ("EXPORT", "Export"),
        ("ACCESS_DENIED", "Access Denied"),

        # 🔴 LIVE STREAM / SOS (NEW)
        ("STREAM_START", "Stream Started"),
        ("STREAM_END", "Stream Ended"),
        ("STREAM_VIEW", "Stream Viewed"),
        ("STREAM_RECORDING_READY", "Recording Ready"),

        # 🚑 RESPONDER
        ("RESPONDER_JOIN", "Responder Joined"),
        ("RESPONDER_LEAVE", "Responder Left"),
        ("RESPONDER_ACK", "Responder Acknowledged"),

        # 🧠 AI / SYSTEM
        ("SEVERITY_UPDATE", "Severity Updated"),
        ("NETWORK_LOST", "Network Lost"),

        ("OTHER", "Other"),
    ]

    ROLE_CHOICES = [
        ("USER", "User"),
        ("RESPONDER", "Responder"),
        ("ADMIN", "Admin"),
        ("SYSTEM", "System"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Who performed the action
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs"
    )

    # 🔑 Role at time of action (important for audits)
    actor_role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="USER"
    )

    action = models.CharField(max_length=50, choices=ACTION_CHOICES)

    # 🔗 Generic object reference
    object_type = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=100, blank=True)

    # 🔗 Optional direct stream reference (FAST QUERIES)
    stream_id = models.UUIDField(null=True, blank=True)

    # Request context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    was_successful = models.BooleanField(default=True)

    # Flexible payload (severity score, room, responder id, etc.)
    metadata = models.JSONField(blank=True, null=True)

    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["action"]),
            models.Index(fields=["stream_id"]),
            models.Index(fields=["user"]),
            models.Index(fields=["timestamp"]),
        ]

    def __str__(self):
        return f"{self.action} by {self.user or 'SYSTEM'} at {self.timestamp}"

import uuid
from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class AuditLog(models.Model):
    ACTION_CHOICES = [
        ("CREATE", "Create"),
        ("UPDATE", "Update"),
        ("DELETE", "Delete"),
        ("VIEW", "View"),
        ("LOGIN", "Login"),
        ("LOGOUT", "Logout"),
        ("OTP_VERIFY", "OTP Verify"),
        ("SUSPEND", "Suspend"),
        ("EXPORT", "Export"),
        ("ACCESS_DENIED", "Access Denied"),
        ("OTHER", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs"
    )

    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    object_type = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=100, blank=True)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    was_successful = models.BooleanField(default=True)

    metadata = models.JSONField(blank=True, null=True)

    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.action} by {self.user} at {self.timestamp}"

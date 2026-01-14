import uuid
from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class NotificationType(models.TextChoices):
    REPORT = "REPORT", "Report"
    SOS = "SOS", "SOS Alert"
    COMMUNITY = "COMMUNITY", "Community"
    SYSTEM = "SYSTEM", "System"


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications"
    )

    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices
    )

    title = models.CharField(max_length=255)
    message = models.TextField()

    is_read = models.BooleanField(default=False)

    metadata = models.JSONField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.notification_type} → {self.recipient}"

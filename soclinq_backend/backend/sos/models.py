import uuid
from django.db import models
from django.conf import settings
from community.models import CommunityHub
from django.contrib.gis.db import models as gis_models


User = settings.AUTH_USER_MODEL


class SOSStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    CANCELLED = "CANCELLED", "Cancelled"
    RESOLVED = "RESOLVED", "Resolved"


class SOSAlert(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sos_alerts"
    )

    hub = models.ForeignKey(
        CommunityHub,
        on_delete=models.CASCADE,
        related_name="sos_alerts"
    )

    location = gis_models.PointField(geography=True)


    status = models.CharField(
        max_length=20,
        choices=SOSStatus.choices,
        default=SOSStatus.ACTIVE
    )

    draft = models.OneToOneField(
        "SosDraft",
        on_delete=models.PROTECT,
        related_name="sos",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"SOS ({self.status})"

# sos/models.py
import uuid
from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class SosDraft(models.Model):
    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("CONFIRMED", "Confirmed"),
        ("CANCELLED", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sos_drafts",
    )

    message = models.TextField(blank=True)

    severity_level = models.CharField(
        max_length=10,
        blank=True,
        null=True,
    )
    severity_score = models.FloatField(blank=True, null=True)

    signal_quality = models.CharField(
        max_length=10,
        blank=True,
        null=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="DRAFT",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"SOS Draft {self.id} ({self.status})"

# sos/models.py (continued)
class SosMedia(models.Model):
    MEDIA_TYPE_CHOICES = [
        ("audio", "Audio"),
        ("video", "Video"),
        ("image", "Image"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    draft = models.ForeignKey(
        SosDraft,
        on_delete=models.CASCADE,
        related_name="media",
    )

    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES)

    file = models.FileField(upload_to="sos/pre/")

    duration_seconds = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Audio/Video duration in seconds",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["media_type"]),
            models.Index(fields=["created_at"]),
        ]

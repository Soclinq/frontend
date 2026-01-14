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

    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"SOS ({self.status})"

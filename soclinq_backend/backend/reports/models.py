import uuid
from django.db import models
from django.conf import settings
from community.models import CommunityHub
from django.contrib.gis.db import models as gis_models

User = settings.AUTH_USER_MODEL


class ReportCategory(models.TextChoices):
    CRIME = "CRIME", "Crime"
    FIRE = "FIRE", "Fire"
    MEDICAL = "MEDICAL", "Medical"
    DISASTER = "DISASTER", "Disaster"
    ELECTION = "ELECTION", "Election"


class ReportStatus(models.TextChoices):
    SUBMITTED = "SUBMITTED", "Submitted"
    UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
    ASSIGNED = "ASSIGNED", "Assigned"
    RESOLVED = "RESOLVED", "Resolved"
    REJECTED = "REJECTED", "Rejected"


class Report(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    reporter = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reports"
    )

    hub = models.ForeignKey(
        CommunityHub,
        on_delete=models.CASCADE,
        related_name="reports"
    )

    category = models.CharField(
        max_length=20,
        choices=ReportCategory.choices
    )

    urgency = models.CharField(
        max_length=10,
        choices=[("LOW", "Low"), ("MEDIUM", "Medium"), ("HIGH", "High")],
    )

    description = models.TextField()

    is_anonymous = models.BooleanField(default=False)

    location = gis_models.PointField(geography=True)


    status = models.CharField(
        max_length=20,
        choices=ReportStatus.choices,
        default=ReportStatus.SUBMITTED
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.category} - {self.status}"

class ReportMedia(models.Model):
    report = models.ForeignKey(
        Report,
        on_delete=models.CASCADE,
        related_name="media"
    )

    file = models.FileField(upload_to="reports/media/")
    media_type = models.CharField(
        max_length=10,
        choices=[("IMAGE", "Image"), ("VIDEO", "Video"), ("AUDIO", "Audio")]
    )

    uploaded_at = models.DateTimeField(auto_now_add=True)

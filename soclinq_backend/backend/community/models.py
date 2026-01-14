import uuid
from django.db import models
from django.conf import settings
from django.contrib.gis.db import models as gis_models



User = settings.AUTH_USER_MODEL


class HubLevel(models.TextChoices):
    LOCAL = "LOCAL", "Local / Community"
    LGA = "LGA", "Local Government"
    STATE = "STATE", "State"
    NATIONAL = "NATIONAL", "National"


class CommunityHub(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=255)
    level = models.CharField(max_length=20, choices=HubLevel.choices)

    country = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True)
    lga = models.CharField(max_length=100, blank=True)

    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children"
    )

    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = (
            "level",
            "country",
            "state",
            "lga",
        )

    def __str__(self):
        return f"{self.name} ({self.level})"


class HubRole(models.TextChoices):
    MEMBER = "MEMBER", "Member"
    LEADER = "LEADER", "Leader"
    MODERATOR = "MODERATOR", "Moderator"


class CommunityMembership(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="community_memberships"
    )
    hub = models.ForeignKey(
        CommunityHub,
        on_delete=models.CASCADE,
        related_name="memberships"
    )

    role = models.CharField(
        max_length=20,
        choices=HubRole.choices,
        default=HubRole.MEMBER
    )

    is_active = models.BooleanField(default=True)

    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "hub")

# community/models.py
import uuid
from django.contrib.gis.db import models as gis_models
from django.db import models
from django.conf import settings
from django.contrib.postgres.indexes import GistIndex 

from django.utils import timezone



class AdminUnit(models.Model):
    """
    Geographic administrative unit based on global standards (GADM).
    ADMIN_0 = Country
    ADMIN_1 = State / Province / Region
    ADMIN_2 = District / County / Municipality
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    country_code = models.CharField(
        max_length=2,
        db_index=True,
        help_text="ISO-3166-1 alpha-2 country code (e.g. NG, US)",
    )

    level = models.PositiveSmallIntegerField(
        db_index=True,
        help_text="Administrative level (0, 1, 2, ...)",
    )

    name = models.CharField(max_length=255)

    code = models.CharField(
        max_length=64,
        db_index=True,
        help_text="Stable GADM identifier (GID)",
    )

    type = models.CharField(max_length=100, blank=True)
    eng_type = models.CharField(max_length=100, blank=True)

    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        related_name="children",
        on_delete=models.CASCADE,
    )

    geom = gis_models.MultiPolygonField(srid=4326)
    created_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        unique_together = ("country_code", "level", "code")
        indexes = [
            GistIndex(fields=["geom"], name="adminunit_geom_gist"),
        ]


    def __str__(self):
        return f"{self.name} (ADMIN_{self.level})"


class HubType(models.TextChoices):
    SYSTEM = "SYSTEM", "System (Geographic)"
    LOCAL = "LOCAL", "Local / User Created"

class CommunityHub(models.Model):
    """
    Social community hub.
    - SYSTEM hubs map 1:1 to AdminUnit
    - LOCAL hubs are user-created and belong under ADMIN_2 hubs
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    admin_unit = models.OneToOneField(
        "community.AdminUnit",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="hub",
        help_text="Linked geographic admin unit (for SYSTEM hubs)",
    )

    name = models.CharField(max_length=255)

    hub_type = models.CharField(
        max_length=20,
        choices=HubType.choices,
        default=HubType.LOCAL,
    )

    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        related_name="children",
        on_delete=models.CASCADE,
    )

    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["admin_unit"],
                condition=models.Q(hub_type=HubType.SYSTEM),
                name="unique_system_hub_per_admin_unit",
            )
        ]

    def __str__(self):
        return self.name


class MembershipRole(models.TextChoices):
    MEMBER = "MEMBER", "Member"
    LEADER = "LEADER", "Leader"
    MODERATOR = "MODERATOR", "Moderator"

class CommunityMembership(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="community_memberships",
    )

    hub = models.ForeignKey(
        "community.CommunityHub",
        on_delete=models.CASCADE,
        related_name="memberships",
    )

    role = models.CharField(
        max_length=20,
        choices=MembershipRole.choices,
        default=MembershipRole.MEMBER,
    )

    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "hub")

    def __str__(self):
        return f"{self.user} → {self.hub} ({self.role})"



class HubMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    hub = models.ForeignKey(
        CommunityHub,
        on_delete=models.CASCADE,
        related_name="messages",
    )

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )

    text = models.TextField()

    created_at = models.DateTimeField(default=timezone.now)

    # optional (for future)
    seen_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="seen_messages",
    )

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender} → {self.hub}: {self.text[:25]}"

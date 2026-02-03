from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from .managers import UserManager
import uuid
from django.contrib.gis.db import models as gis_models
from django.conf import settings
from django.db import models

class Organization(models.Model):
    ORG_TYPES = [
        ("NGO", "NGO"),
        ("GOVERNMENT", "Government"),
        ("NON_PROFIT", "Non-profit"),
        ("COMMUNITY", "Community"),
        ("OTHER", "Other"),
    ]

    name = models.CharField(max_length=255)
    org_type = models.CharField(max_length=20, choices=ORG_TYPES)
    org_type_other = models.CharField(max_length=255, blank=True)
    address = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organizations"
    )

    created_at = models.DateTimeField(auto_now_add=True)

def verification_upload_path(instance, filename):
    return f"verification/{instance.user.id}/{filename}"

class VerificationDocument(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="documents"
    )
    file = models.FileField(upload_to=verification_upload_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)

class UserRole(models.TextChoices):
    CITIZEN = "CITIZEN", "Citizen"
    COMMUNITY_LEADER = "COMMUNITY_LEADER", "Community Leader"
    LAW_ENFORCEMENT = "LAW_ENFORCEMENT", "Law Enforcement"
    NGO_PARTNER = "NGO_PARTNER", "NGO Partner"
    HQ_ADMIN = "HQ_ADMIN", "HQ Admin"
    INVESTIGATOR = "INVESTIGATOR", "Investigator"

from community.models import AdminUnit
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # ─────────────────────────────
    # Core identity
    # ─────────────────────────────
    email = models.EmailField(unique=True, null=True, blank=True)
    phone_number = models.CharField(max_length=20, unique=True)
    username = models.CharField(max_length=150, unique=True)

    # ─────────────────────────────
    # Role
    # ─────────────────────────────
    role = models.CharField(
        max_length=30,
        choices=UserRole.choices,
        default=UserRole.CITIZEN,
    )

    # ─────────────────────────────
    # Profile
    # ─────────────────────────────
    full_name = models.CharField(max_length=255, blank=True)
    live_photo = models.ImageField(
        upload_to="users/live_photos/",
        null=True,
        blank=True,
    )

    preferred_language = models.CharField(max_length=20, default="en")

    # ─────────────────────────────
    # 📍 Location (AUTHORITATIVE)
    # ─────────────────────────────
    last_known_location = gis_models.PointField(
        geography=True,
        srid=4326,
        null=True,
        blank=True,
        help_text="Last known GPS/IP-based location",
    )

    location_source = models.CharField(
        max_length=20,
        choices=[
            ("GPS", "GPS"),
            ("IP", "IP"),
            ("MANUAL", "Manual"),
            ("UNKNOWN", "Unknown"),
        ],
        default="UNKNOWN",
    )

    location_confidence = models.CharField(
        max_length=10,
        choices=[
            ("HIGH", "High"),
            ("MEDIUM", "Medium"),
            ("LOW", "Low"),
        ],
        default="LOW",
    )

    # ─────────────────────────────
    # 🧭 Resolved administrative units
    # ─────────────────────────────
    admin_0 = models.ForeignKey(
        AdminUnit,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="users_admin_0",
        limit_choices_to={"level": 0},
    )

    admin_1 = models.ForeignKey(
        AdminUnit,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="users_admin_1",
        limit_choices_to={"level": 1},
    )

    admin_2 = models.ForeignKey(
        AdminUnit,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="users_admin_2",
        limit_choices_to={"level": 2},
    )

    location_updated_at = models.DateTimeField(null=True, blank=True)

    # ─────────────────────────────
    # Device binding
    # ─────────────────────────────
    imei = models.CharField(max_length=50, blank=True, null=True)
    sim_number = models.CharField(max_length=50, blank=True, null=True)
    phone_model = models.CharField(max_length=100, blank=True)
    last_ip_address = models.GenericIPAddressField(null=True, blank=True)

    # ─────────────────────────────
    # Security & account state
    # ─────────────────────────────
    is_active = models.BooleanField(default=True)
    is_suspended = models.BooleanField(default=False)

    failed_login_attempts = models.PositiveIntegerField(default=0)
    lock_until = models.DateTimeField(null=True, blank=True)

    # ─────────────────────────────
    # System flags
    # ─────────────────────────────
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    date_joined = models.DateTimeField(default=timezone.now)
    last_updated = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "phone_number"
    REQUIRED_FIELDS = ["username"]

    objects = UserManager()

    def __str__(self):
        return f"{self.username} ({self.role})"

class SecurityQuestion(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="security_questions")
    question = models.CharField(max_length=255)
    answer_hash = models.CharField(max_length=255)

class OTP(models.Model):
    PURPOSE_CHOICES = (
        ("LOGIN", "Login"),
        ("RESET", "Password Reset"),
        ("VERIFY", "Account Verification"),
    )

    identifier = models.CharField(max_length=255)
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return (timezone.now() - self.created_at).seconds > 12300  # 5 minutes


import uuid
import re
from django.db import models
from django.conf import settings
from django.utils import timezone


USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,32}$")


class UsernameEntityType(models.TextChoices):
    USER = "USER", "User"
    HUB = "HUB", "Community Hub"
    ORG = "ORG", "Organization"
    RESPONDER = "RESPONDER", "Responder"
    SYSTEM = "SYSTEM", "System"


class UsernameTier(models.TextChoices):
    PUBLIC = "PUBLIC", "Public"
    RESTRICTED = "RESTRICTED", "Restricted"
    SYSTEM = "SYSTEM", "System Reserved"


class UsernameStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    DISABLED = "DISABLED", "Disabled"
    LOCKED = "LOCKED", "Locked"


class UsernameRegistry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    username = models.CharField(max_length=32, unique=True)
    username_lower = models.CharField(max_length=32, unique=True, db_index=True)

    entity_type = models.CharField(max_length=20, choices=UsernameEntityType.choices)
    tier = models.CharField(max_length=20, choices=UsernameTier.choices, default=UsernameTier.PUBLIC)
    status = models.CharField(max_length=20, choices=UsernameStatus.choices, default=UsernameStatus.ACTIVE)

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="public_username",
    )

    hub = models.OneToOneField(
        "community.CommunityHub",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="public_username",
    )

    organization = models.OneToOneField(
        "accounts.Organization",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="public_username",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="usernames_created",
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="usernames_approved",
    )

    note = models.CharField(max_length=255, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    last_changed_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["username_lower"]),
            models.Index(fields=["tier"]),
            models.Index(fields=["entity_type"]),
            models.Index(fields=["status"]),
        ]

    def clean_username(self, value: str) -> str:
        u = (value or "").strip()

        if not USERNAME_RE.match(u):
            raise ValueError("Username must be 3-32 chars and contain only letters, numbers, underscore")

        if u.startswith("_") or u.endswith("_"):
            raise ValueError("Username cannot start or end with underscore")

        if "__" in u:
            raise ValueError("Username cannot contain repeated underscores")

        return u

    def save(self, *args, **kwargs):
        if self.username:
            self.username = self.clean_username(self.username)
            self.username_lower = self.username.lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.entity_type}, {self.tier})"


import uuid
from django.db import models


class ReservedUsernameType(models.TextChoices):
    SYSTEM = "SYSTEM", "System Only"
    RESTRICTED = "RESTRICTED", "Restricted"
    BLOCKED = "BLOCKED", "Blocked"


class ReservedUsername(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    username_lower = models.CharField(max_length=32, unique=True, db_index=True)
    reserved_type = models.CharField(max_length=20, choices=ReservedUsernameType.choices)

    reason = models.CharField(max_length=255, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.username_lower} ({self.reserved_type})"


import uuid
from django.db import models
from django.conf import settings


class EmergencyContact(models.Model):
    RELATIONSHIP_CHOICES = [
        ("FAMILY", "Family"),
        ("FRIEND", "Friend"),
        ("NEIGHBOR", "Neighbor"),
        ("COLLEAGUE", "Colleague"),
        ("OTHER", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="emergency_contacts",
    )

    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=30)

    relationship = models.CharField(
        max_length=20,
        choices=RELATIONSHIP_CHOICES,
        blank=True,
        null=True,
    )

    priority = models.PositiveSmallIntegerField(blank=True, null=True)
    verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["priority", "-created_at"]
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["verified"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.phone})"


import uuid
from django.db import models
from django.conf import settings


import uuid
from django.db import models
from django.conf import settings


class ProfileSettings(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile_settings",
    )

    # -------------------------
    # Emergency mode
    # -------------------------
    emergency_mode_enabled = models.BooleanField(default=False)

    # -------------------------
    # Device/location
    # -------------------------
    tracking_enabled = models.BooleanField(default=True)
    location_enabled = models.BooleanField(default=True)

    # -------------------------
    # Privacy & permissions
    # -------------------------
    allow_location_sharing = models.BooleanField(default=True)
    allow_anonymous_reports = models.BooleanField(default=True)
    allow_push_notifications = models.BooleanField(default=True)

    allow_messages_from = models.CharField(
        max_length=20,
        choices=[
            ("EVERYONE", "Everyone"),
            ("CONTACTS_ONLY", "Contacts Only"),
            ("VERIFIED_ONLY", "Verified Only"),
        ],
        default="EVERYONE",
    )

    allow_device_binding = models.BooleanField(default=True)
    allow_media_upload = models.BooleanField(default=True)

    searchable_by_username = models.BooleanField(default=True)
    hide_last_seen = models.BooleanField(default=False)

    # -------------------------
    # SOS features
    # -------------------------
    sos_silent_mode = models.BooleanField(default=False)
    sos_countdown_seconds = models.PositiveIntegerField(default=5)

    sos_auto_call_enabled = models.BooleanField(default=False)
    sos_auto_share_location = models.BooleanField(default=True)
    sos_auto_record_audio = models.BooleanField(default=False)

    # -------------------------
    # Quiet hours
    # -------------------------
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.CharField(max_length=10, blank=True, null=True)  # "22:00"
    quiet_hours_end = models.CharField(max_length=10, blank=True, null=True)    # "06:00"

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings({self.user_id})"


import uuid
from django.db import models
from django.conf import settings


class AccountDeletionRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="deletion_requests",
    )

    reason = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=[
            ("PENDING", "Pending"),
            ("APPROVED", "Approved"),
            ("REJECTED", "Rejected"),
            ("CANCELLED", "Cancelled"),
        ],
        default="PENDING",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "status", "created_at"])]

    def __str__(self):
        return f"DeletionRequest({self.user_id}, {self.status})"

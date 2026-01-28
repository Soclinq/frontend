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

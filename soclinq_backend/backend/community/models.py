# community/models.py
import uuid
from django.contrib.gis.db import models as gis_models
from django.db import models
from django.conf import settings
from django.contrib.postgres.indexes import GistIndex 
from django.utils import timezone

class HubPrivacy(models.TextChoices):
    PUBLIC = "PUBLIC", "Public"
    PRIVATE = "PRIVATE", "Private"
    INVITE_ONLY = "INVITE_ONLY", "Invite Only"


class JoinMode(models.TextChoices):
    OPEN = "OPEN", "Open"
    REQUEST = "REQUEST", "Request"
    APPROVAL = "APPROVAL", "Approval"


class VerificationStatus(models.TextChoices):
    UNVERIFIED = "UNVERIFIED", "Unverified"
    PENDING = "PENDING", "Pending Review"
    VERIFIED = "VERIFIED", "Verified"
    REJECTED = "REJECTED", "Rejected"


class HubPurpose(models.TextChoices):
    SECURITY = "SECURITY", "Security"
    EMERGENCY = "EMERGENCY", "Emergency"
    COMMUNITY = "COMMUNITY", "Community"
    TRAFFIC = "TRAFFIC", "Traffic"
    ALERTS = "ALERTS", "Alerts"


class AlertPriority(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    CRITICAL = "CRITICAL", "Critical"


class HubType(models.TextChoices):
    SYSTEM = "SYSTEM", "System (Geographic)"
    LOCAL = "LOCAL", "Local / User Created"

class MembershipRole(models.TextChoices):
    MEMBER = "MEMBER", "Member"
    LEADER = "LEADER", "Leader"
    MODERATOR = "MODERATOR", "Moderator"

class MessageType(models.TextChoices):
    TEXT = "TEXT", "Text"
    MEDIA = "MEDIA", "Media"
    SYSTEM = "SYSTEM", "System"

class AttachmentType(models.TextChoices):
    IMAGE = "IMAGE", "Image"
    AUDIO = "AUDIO", "Audio"
    VIDEO = "VIDEO", "Video"
    FILE = "FILE", "File"


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

class CommunityHub(models.Model):
    """
    Security-grade community hub.
    - SYSTEM hubs map 1:1 to AdminUnit
    - LOCAL hubs are user-created under ADMIN_2 hubs
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # ✅ geographic binding for SYSTEM hubs
    admin_unit = models.OneToOneField(
        "community.AdminUnit",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="hub",
        help_text="Linked geographic admin unit (for SYSTEM hubs)",
    )

    # ✅ identity
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    category = models.CharField(max_length=80, blank=True, default="General")

    # ✅ tags + search
    tags = models.JSONField(default=list, blank=True)

    # ✅ media
    cover_image = models.URLField(blank=True, null=True)
    avatar_icon = models.URLField(blank=True, null=True)

    # ✅ readable location label
    location_label = models.CharField(max_length=255, blank=True, default="")

    # ✅ hub type (system/local)
    hub_type = models.CharField(
        max_length=20,
        choices=HubType.choices,
        default=HubType.LOCAL,
        db_index=True,
    )

    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        related_name="children",
        on_delete=models.CASCADE,
    )

    # ✅ general status
    is_default = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # =====================================================
    # ✅ TRUST / VERIFICATION (Security grade)
    # =====================================================
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.UNVERIFIED,
        db_index=True,
    )

    verified_at = models.DateTimeField(null=True, blank=True)
    verification_note = models.TextField(blank=True, default="")

    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="verified_hubs",
    )

    trust_score = models.PositiveSmallIntegerField(default=0)  # 0 - 100

    # =====================================================
    # ✅ PRIVACY / ACCESS CONTROL
    # =====================================================
    privacy = models.CharField(
        max_length=20,
        choices=HubPrivacy.choices,
        default=HubPrivacy.PUBLIC,
        db_index=True,
    )

    join_mode = models.CharField(
        max_length=20,
        choices=JoinMode.choices,
        default=JoinMode.OPEN,
        db_index=True,
    )

    is_locked = models.BooleanField(default=False)
    allow_guest_view = models.BooleanField(default=True)

    requires_identity_verification = models.BooleanField(default=False)
    requires_phone_verification = models.BooleanField(default=False)
    requires_location_match = models.BooleanField(default=False)

    min_age = models.PositiveSmallIntegerField(null=True, blank=True)
    min_account_age_days = models.PositiveSmallIntegerField(default=0)

    # ✅ forwarding / screenshots protection (optional)
    allow_forwarding_messages = models.BooleanField(default=True)
    allow_screenshots = models.BooleanField(default=True)

    # =====================================================
    # ✅ MODERATION / SAFETY
    # =====================================================
    rules = models.TextField(blank=True, default="")

    report_count = models.PositiveIntegerField(default=0)
    flagged_message_count = models.PositiveIntegerField(default=0)

    auto_moderation_enabled = models.BooleanField(default=False)
    profanity_filter_enabled = models.BooleanField(default=False)

    banned_words = models.JSONField(default=list, blank=True)

    allow_media = models.BooleanField(default=True)
    allow_links = models.BooleanField(default=True)

    link_whitelist_only = models.BooleanField(default=False)
    link_whitelist = models.JSONField(default=list, blank=True)

    slow_mode_seconds = models.PositiveIntegerField(default=0)
    rate_limit_per_user_per_minute = models.PositiveIntegerField(default=60)

    message_requires_approval = models.BooleanField(default=False)

    max_file_size_mb = models.PositiveIntegerField(default=25)
    max_daily_reports_per_user = models.PositiveIntegerField(default=10)

    max_members = models.PositiveIntegerField(null=True, blank=True)

    # =====================================================
    # ✅ AUDIT / COMPLIANCE
    # =====================================================
    audit_enabled = models.BooleanField(default=True)
    audit_retention_days = models.PositiveIntegerField(default=90)
    export_logs_enabled = models.BooleanField(default=False)
    last_security_reviewed_at = models.DateTimeField(null=True, blank=True)

    # =====================================================
    # ✅ INCIDENT / EMERGENCY FEATURES
    # =====================================================
    hub_purpose = models.CharField(
        max_length=20,
        choices=HubPurpose.choices,
        default=HubPurpose.COMMUNITY,
        db_index=True,
    )

    alert_mode_enabled = models.BooleanField(default=False)

    alert_priority_default = models.CharField(
        max_length=20,
        choices=AlertPriority.choices,
        default=AlertPriority.MEDIUM,
    )

    allow_anonymous_reports = models.BooleanField(default=False)
    allow_location_sharing = models.BooleanField(default=True)

    emergency_contacts = models.JSONField(default=list, blank=True)
    hotline_number = models.CharField(max_length=30, blank=True, default="")
    rapid_response_team_enabled = models.BooleanField(default=False)

    # =====================================================
    # ✅ GEO-SECURITY / GEOFENCING
    # =====================================================
    geo_fenced = models.BooleanField(default=False)
    geo_radius_km = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )

    allowed_lga_ids = models.JSONField(default=list, blank=True)
    allowed_state_ids = models.JSONField(default=list, blank=True)

    # =====================================================
    # ✅ OWNERSHIP / MANAGEMENT
    # =====================================================
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_hubs",
    )

    last_updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_hubs",
    )

    ownership_transfer_allowed = models.BooleanField(default=True)

    # =====================================================
    # ✅ ANALYTICS COUNTERS (Optional but useful)
    # =====================================================
    members_count = models.PositiveIntegerField(default=0)
    messages_count = models.PositiveIntegerField(default=0)
    attachments_count = models.PositiveIntegerField(default=0)

    active_members_7d = models.PositiveIntegerField(default=0)
    new_members_7d = models.PositiveIntegerField(default=0)
    engagement_score = models.PositiveIntegerField(default=0)
    trending_rank = models.PositiveIntegerField(default=0)

    # =====================================================
    # ✅ MONETIZATION (Optional)
    # =====================================================
    is_sponsored = models.BooleanField(default=False)
    sponsor_name = models.CharField(max_length=120, blank=True, default="")

    donation_enabled = models.BooleanField(default=False)
    subscription_enabled = models.BooleanField(default=False)
    ad_slots_enabled = models.BooleanField(default=False)

    # =====================================================
    # ✅ timestamps
    # =====================================================
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["admin_unit"],
                condition=models.Q(hub_type=HubType.SYSTEM),
                name="unique_system_hub_per_admin_unit",
            )
        ]
        indexes = [
            models.Index(fields=["hub_type", "is_active"]),
            models.Index(fields=["privacy", "join_mode"]),
            models.Index(fields=["verification_status"]),
            models.Index(fields=["hub_purpose"]),
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return self.name

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
        db_index=True,
    )

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
        db_index=True,
    )

    message_type = models.CharField(
        max_length=20,
        choices=MessageType.choices,
        default=MessageType.TEXT,
        db_index=True,
    )

    seen_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="seen_messages",
    )


    forwarded_from = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        related_name="forwards",
        on_delete=models.SET_NULL,
    )

    forwarded_count = models.PositiveIntegerField(default=0)


    is_forwarded = models.BooleanField(default=False)


    text = models.TextField(blank=True)  # ✅ allow empty for media-only

    # ✅ WhatsApp-like reply feature
    reply_to = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="replies",
    )

    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    # ✅ edit + soft delete support
    edited_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # ✅ optional client temp ID for dedupe
    client_temp_id = models.CharField(max_length=100, blank=True, db_index=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["hub", "-created_at"]),
            models.Index(fields=["sender", "-created_at"]),
        ]

    def __str__(self):
        preview = self.text[:25] if self.text else "[media]"
        return f"{self.sender} → {self.hub}: {preview}"

class MessageAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    message = models.ForeignKey(
        HubMessage,
        on_delete=models.CASCADE,
        related_name="attachments",
    )

    attachment_type = models.CharField(
        max_length=20,
        choices=AttachmentType.choices,
        db_index=True,
    )

    # ✅ AWS S3 file URL (public or CloudFront)
    url = models.URLField()

    # ✅ store S3 key too (for deleting files later)
    s3_key = models.CharField(max_length=500, blank=True)

    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)  # bytes
    mime_type = models.CharField(max_length=100, blank=True)

    # ✅ optional metadata
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)

    # ✅ helpful for video previews
    thumbnail_url = models.URLField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    

    class Meta:
        indexes = [
            models.Index(fields=["message", "attachment_type"]),
        ]

    def __str__(self):
        return f"{self.attachment_type} for {self.message_id}"

def clone_attachments(old_message, new_message):
    for a in old_message.attachments.all():
        MessageAttachment.objects.create(
            message=new_message,
            attachment_type=a.attachment_type,
            url=a.url,
            thumbnail_url=a.thumbnail_url,
            mime_type=a.mime_type,
            file_name=a.file_name,
            file_size=a.file_size,
            width=a.width,
            height=a.height,
            duration_ms=a.duration_ms,
        )

class HubReadReceipt(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hub_read_receipts",
    )

    hub = models.ForeignKey(
        CommunityHub,
        on_delete=models.CASCADE,
        related_name="read_receipts",
    )

    last_seen_message = models.ForeignKey(
        HubMessage,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    last_seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "hub")
        indexes = [
            models.Index(fields=["hub", "last_seen_at"]),
        ]

    def __str__(self):
        return f"{self.user} read {self.hub}"

class MessageReaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    message = models.ForeignKey(
        HubMessage,
        on_delete=models.CASCADE,
        related_name="reactions",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="message_reactions",
    )

    emoji = models.CharField(max_length=20)  # 👍 ❤️ 😂 🔥 etc
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("message", "user", "emoji")
        indexes = [
            models.Index(fields=["message", "emoji"]),
        ]

    def __str__(self):
        return f"{self.user} reacted {self.emoji}"

class HubPinnedMessage(models.Model):
    hub = models.ForeignKey(
        CommunityHub,
        on_delete=models.CASCADE,
        related_name="pinned_messages",
    )

    message = models.ForeignKey(
        HubMessage,
        on_delete=models.CASCADE,
        related_name="+",
    )

    pinned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pinned_messages",
    )

    pinned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("hub", "message")



class HubMessageHidden(models.Model):
    """
    WhatsApp 'Delete for me' feature.
    Message remains in DB but user won't see it anymore.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    message = models.ForeignKey(
        "community.HubMessage",
        on_delete=models.CASCADE,
        related_name="hidden_by",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hidden_messages",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("message", "user")

    def __str__(self):
        return f"{self.user} hid {self.message_id}"

class HubMessageReceipt(models.Model):
    """
    Tracks delivery/read state per user per message.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    message = models.ForeignKey(
        "community.HubMessage",
        on_delete=models.CASCADE,
        related_name="receipts",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="message_receipts",
    )

    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("message", "user")
        indexes = [
            models.Index(fields=["message", "user"]),
            models.Index(fields=["message", "read_at"]),
        ]

class HubMessageReaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    message = models.ForeignKey(
        "community.HubMessage",
        on_delete=models.CASCADE,
        related_name="reaction_items",
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    emoji = models.CharField(max_length=16)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["message", "user"], name="unique_one_reaction_per_user_per_message")
        ]


# community/private_models.py (or community/models.py if you prefer)

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class PrivateConversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="private_conversations_as_user1",
        db_index=True,
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="private_conversations_as_user2",
        db_index=True,
    )

    # ✅ chat settings (WhatsApp-like)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # ✅ prevent duplicate conversations
            models.UniqueConstraint(
                fields=["user1", "user2"],
                name="unique_private_conversation_pair",
            ),
        ]
        indexes = [
            models.Index(fields=["user1", "updated_at"]),
            models.Index(fields=["user2", "updated_at"]),
        ]

    def __str__(self):
        return f"PrivateConversation({self.user1_id} ↔ {self.user2_id})"


class PrivateConversationMember(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="private_memberships",
        db_index=True,
    )

    conversation = models.ForeignKey(
        "community.PrivateConversation",
        on_delete=models.CASCADE,
        related_name="members",
        db_index=True,
    )

    # ✅ WhatsApp controls
    muted_until = models.DateTimeField(null=True, blank=True)
    pinned_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    # ✅ unread / read sync
    last_read_at = models.DateTimeField(null=True, blank=True)
    last_delivered_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "conversation")
        indexes = [
            models.Index(fields=["user", "pinned_at"]),
            models.Index(fields=["user", "archived_at"]),
        ]

    def __str__(self):
        return f"{self.user_id} in {self.conversation_id}"

class PrivateMessageType(models.TextChoices):
    TEXT = "TEXT", "Text"
    MEDIA = "MEDIA", "Media"
    SYSTEM = "SYSTEM", "System"


class PrivateMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    conversation = models.ForeignKey(
        "community.PrivateConversation",
        on_delete=models.CASCADE,
        related_name="messages",
        db_index=True,
    )

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="private_sent_messages",
        db_index=True,
    )

    message_type = models.CharField(
        max_length=20,
        choices=PrivateMessageType.choices,
        default=PrivateMessageType.TEXT,
        db_index=True,
    )

    text = models.TextField(blank=True)

    # ✅ reply support
    reply_to = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="replies",
    )

    # ✅ edit + soft delete
    edited_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    client_temp_id = models.CharField(max_length=100, blank=True, db_index=True)

    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "-created_at"]),
            models.Index(fields=["sender", "-created_at"]),
        ]

    def __str__(self):
        preview = self.text[:25] if self.text else "[media]"
        return f"{self.sender_id} → {self.conversation_id}: {preview}"


class PrivateMessageAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    message = models.ForeignKey(
        "community.PrivateMessage",
        on_delete=models.CASCADE,
        related_name="attachments",
    )

    attachment_type = models.CharField(
        max_length=20,
        choices=AttachmentType.choices,  # ✅ reuse AttachmentType
        db_index=True,
    )

    url = models.URLField()
    s3_key = models.CharField(max_length=500, blank=True)

    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)

    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)

    thumbnail_url = models.URLField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["message", "attachment_type"]),
        ]

class PrivateMessageHidden(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    message = models.ForeignKey(
        "community.PrivateMessage",
        on_delete=models.CASCADE,
        related_name="hidden_by",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hidden_private_messages",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("message", "user")

class PrivateMessageReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    message = models.ForeignKey(
        "community.PrivateMessage",
        on_delete=models.CASCADE,
        related_name="receipts",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="private_message_receipts",
    )

    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("message", "user")
        indexes = [
            models.Index(fields=["message", "user"]),
            models.Index(fields=["message", "read_at"]),
        ]

class PrivateMessageReaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    message = models.ForeignKey(
        "community.PrivateMessage",
        on_delete=models.CASCADE,
        related_name="reactions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="private_message_reactions",
    )

    emoji = models.CharField(max_length=16)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["message", "user"],
                name="unique_one_private_reaction_per_user_per_message",
            )
        ]

class UserBlock(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="blocked_users",
    )
    blocked = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="blocked_by_users",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("blocker", "blocked")

class EmergencyShareSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sos_sessions",
    )

    shared_with = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sos_received_sessions",
    )

    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

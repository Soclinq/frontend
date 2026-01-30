# community/models.py
import uuid
from django.contrib.gis.db import models as gis_models
from django.db import models
from django.conf import settings
from django.contrib.postgres.indexes import GistIndex 
from django.utils import timezone


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
        on_delete=models.SET_NULL,
        related_name="forwarded_copies",
    )

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

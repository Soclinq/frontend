# community/services/types.py
from dataclasses import dataclass
from typing import Dict, Optional
from community.models import AdminUnit, CommunityHub
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.db.models import Q
from community.models import AdminUnit, CommunityHub


@dataclass
class ResolvedLocation:
    latitude: float
    longitude: float

    admin_units: Dict[int, AdminUnit]        # {0,1,2}
    hubs: Dict[int, CommunityHub]             # {0,1,2}

    country_code: Optional[str]
    confidence: str                           # HIGH | MEDIUM | LOW




class LocationResolver:
    """
    Authoritative location resolver for communities, SOS, emergencies.
    """

    def __init__(self, lat: float, lng: float, country_code: str | None = None):
        self.lat = lat
        self.lng = lng
        self.country_code = country_code

        self.point = Point(lng, lat, srid=4326)

    # -------------------------------------------------
    # 1️⃣ Resolve Admin Units (STRICT)
    # -------------------------------------------------

    from django.contrib.gis.geos import GEOSGeometry

    def resolve_admin_units(self) -> dict[int, AdminUnit]:
        """
        Robust point-in-polygon resolution.
        """
        # Small buffer (~20m) to handle boundary & GPS jitter
        buffered_point = self.point.buffer(0.0002)

        qs = AdminUnit.objects.filter(
            geom__intersects=buffered_point
        )

        if self.country_code:
            qs = qs.filter(country_code=self.country_code)

        units = {}
        for u in qs.order_by("level"):
            units[u.level] = u

        return units

    # -------------------------------------------------
    # 2️⃣ Resolve Admin Units (FALLBACK – nearest)
    # -------------------------------------------------

    from django.contrib.gis.measure import D

    def resolve_nearest_admin_units(self, max_distance_km=25) -> dict[int, AdminUnit]:
        qs = AdminUnit.objects.annotate(
            distance=Distance("geom", self.point)
        )

        if self.country_code:
            qs = qs.filter(country_code=self.country_code)

        qs = qs.filter(distance__lte=D(km=max_distance_km))
        qs = qs.order_by("level", "distance")

        units = {}
        for u in qs:
            if u.level not in units:
                units[u.level] = u
            if len(units) >= 3:
                break

        return units

    # -------------------------------------------------
    # 3️⃣ Resolve Community Hubs
    # -------------------------------------------------

    def resolve_system_hubs(self, admin_units: dict[int, AdminUnit]) -> dict[int, CommunityHub]:
        hubs = {}

        for level, admin in admin_units.items():
            hub = getattr(admin, "hub", None)
            if hub:
                hubs[level] = hub

        return hubs

    # -------------------------------------------------
    # 4️⃣ Final Resolution (PUBLIC API)
    # -------------------------------------------------

    def _calculate_confidence(self, admin_units, used_fallback):
        if not admin_units:
            return "LOW"

        if used_fallback:
            return "MEDIUM"

        if 0 in admin_units and 1 in admin_units and 2 in admin_units:
            return "HIGH"

        return "MEDIUM"

    def resolve(self) -> ResolvedLocation:
        admin_units = self.resolve_admin_units()
        used_fallback = False

        if not admin_units or 2 not in admin_units:
            admin_units = self.resolve_nearest_admin_units()
            used_fallback = True

        confidence = self._calculate_confidence(admin_units, used_fallback)
        hubs = self.resolve_system_hubs(admin_units)

        country_code = (
            admin_units.get(0).country_code
            if admin_units.get(0)
            else self.country_code
        )

        return ResolvedLocation(
            latitude=self.lat,
            longitude=self.lng,
            admin_units=admin_units,
            hubs=hubs,
            country_code=country_code,
            confidence=confidence,
        )


# community/services/hub_service.py
from community.models import CommunityHub, CommunityMembership, HubType


from django.db import IntegrityError, transaction

def ensure_system_hubs_and_join(user, admin_units):
    hubs = {}

    for level in sorted(admin_units.keys()):
        admin_unit = admin_units[level]

        try:
            with transaction.atomic():
                hub, _ = CommunityHub.objects.get_or_create(
                    admin_unit=admin_unit,
                    defaults={
                        "name": admin_unit.name,
                        "hub_type": HubType.SYSTEM,
                    },
                )
        except IntegrityError:
            hub = CommunityHub.objects.get(
                admin_unit=admin_unit,
                hub_type=HubType.SYSTEM,
            )

        if level > 0 and (level - 1) in hubs:
            parent = hubs[level - 1]
            if hub.parent_id != parent.id:
                hub.parent = parent
                hub.save(update_fields=["parent"])

        CommunityMembership.objects.get_or_create(
            user=user,
            hub=hub,
        )

        hubs[level] = hub

    return hubs



from rest_framework import serializers
from community.models import HubMessage, MessageAttachment


class MessageAttachmentSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="attachment_type")
    thumbnailUrl = serializers.CharField(source="thumbnail_url", allow_blank=True, required=False)


    class Meta:
        model = MessageAttachment
        fields = [
            "id",
            "type",
            "url",
            "thumbnailUrl",
            "mime_type",
            "file_name",
            "file_size",
            "width",
            "height",
            "duration_ms",
        ]


class HubMessageSerializer(serializers.ModelSerializer):
    hubId = serializers.UUIDField(source="hub_id", read_only=True)  # ✅ ADD THIS

    messageType = serializers.CharField(source="message_type")
    createdAt = serializers.DateTimeField(source="created_at")
    clientTempId = serializers.CharField(source="client_temp_id", required=False, allow_blank=True)

    sender = serializers.SerializerMethodField()
    replyTo = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    isMine = serializers.SerializerMethodField()
    editedAt = serializers.DateTimeField(source="edited_at", allow_null=True, required=False)
    deletedAt = serializers.DateTimeField(source="deleted_at", allow_null=True, required=False)


    def get_sender(self, obj):
        user = obj.sender
        return {
            "id": str(user.id),
            "name": getattr(user, "full_name", None) or user.username,
            "photo": getattr(user, "photo", None),
        }

    def get_isMine(self, obj):
        req = self.context.get("request")
        if not req or not req.user.is_authenticated:
            return False
        return str(obj.sender_id) == str(req.user.id)

    def get_replyTo(self, obj):
        if not obj.reply_to_id:
            return None
        return {
            "id": str(obj.reply_to_id),
            "text": obj.reply_to.text if obj.reply_to else "",
            "senderName": getattr(obj.reply_to.sender, "full_name", None)
            or (obj.reply_to.sender.username if obj.reply_to else None),
        }
    
    def to_representation(self, instance):
        data = super().to_representation(instance)

        data["hubId"] = str(instance.hub_id)

        # ✅ if deleted, hide text + attachments
        if instance.deleted_at:
            data["text"] = ""
            data["attachments"] = []
            data["messageType"] = "TEXT"
            data["reactions"] = []
            data["myReaction"] = None

        return data


    def get_attachments(self, obj):
        qs = obj.attachments.all()
        return MessageAttachmentSerializer(qs, many=True).data

    class Meta:
        model = HubMessage
        fields = [
            "id",
            "clientTempId",
            "hubId", 
            "messageType",
            "text",
            "createdAt",
            "sender",
            "replyTo",
            "attachments",
            "isMine",
            "editedAt",    
            "deletedAt",
            "myReaction",
        ]

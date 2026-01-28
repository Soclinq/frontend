from rest_framework.views import APIView
from django.db import transaction
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.gis.geos import Point
from django.utils import timezone
from community.services import LocationResolver, ensure_system_hubs_and_join, AdminUnit
from websocket.events.broadcaster import chat_group_name
from websocket.events.socket import notify_group
import base64
from uuid import UUID
from django.db.models import Q
from community.models import (
    CommunityHub,
    CommunityMembership,
    MembershipRole,
    HubType, HubMessage
)

def encode_cursor(created_at, message_id: UUID) -> str:
    """
    cursor format: base64("timestamp|uuid")
    """
    raw = f"{created_at.isoformat()}|{str(message_id)}"
    return base64.urlsafe_b64encode(raw.encode()).decode()

def decode_cursor(cursor: str):
    """
    returns (created_at_iso, uuid_str) or (None, None)
    """
    try:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        created_at_str, message_id_str = raw.split("|", 1)
        return created_at_str, message_id_str
    except Exception:
        return None, None

class NearbyCommunitiesByLocationView(APIView):
    """
    POST /communities/nearby/

    Body:
    {
      "lat": number,
      "lng": number,
      "source": "GPS" | "IP" | "UNKNOWN",
      "countryCode": "NG" (optional)
    }

    Returns:
    {
      "resolvedLocation": {...},
      "groups": [...]   # ALL LGAs (ADMIN_2) in the user's state
    }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # -------------------------------------------------
        # 1️⃣ Validate input
        # -------------------------------------------------
        lat = request.data.get("lat")
        lng = request.data.get("lng")
        source = request.data.get("source", "UNKNOWN")
        country_code = request.data.get("countryCode")

        if lat is None or lng is None:
            return Response(
                {"error": "Latitude and longitude are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat = float(lat)
            lng = float(lng)
        except (TypeError, ValueError):
            return Response(
                {"error": "Latitude and longitude must be valid numbers"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # 2️⃣ Resolve location → admin units
        # -------------------------------------------------
        resolver = LocationResolver(
            lat=lat,
            lng=lng,
            country_code=country_code,
        )
        resolved = resolver.resolve()

        admin_units = resolved.admin_units      # {0,1,2}
        confidence = resolved.confidence

        if not admin_units:
            return Response(
                {
                    "resolvedLocation": {
                        "source": source,
                        "confidence": "LOW",
                        "primaryAdminLevel": None,
                        "adminUnits": {},
                        "hubs": {},
                    },
                    "groups": [],
                },
                status=status.HTTP_200_OK,
            )

        # -------------------------------------------------
        # 3️⃣ Determine primary admin level
        # -------------------------------------------------
        if 2 in admin_units:
            primary_admin_level = 2
        elif 1 in admin_units:
            primary_admin_level = 1
        else:
            primary_admin_level = 0

        # -------------------------------------------------
        # 4️⃣ Persist location on user
        # -------------------------------------------------
        user = request.user
        user.last_known_location = Point(lng, lat, srid=4326)
        user.location_source = source
        user.location_confidence = confidence
        user.location_updated_at = timezone.now()
        user.admin_0 = admin_units.get(0)
        user.admin_1 = admin_units.get(1)
        user.admin_2 = admin_units.get(2)

        user.save(
            update_fields=[
                "last_known_location",
                "location_source",
                "location_confidence",
                "location_updated_at",
                "admin_0",
                "admin_1",
                "admin_2",
            ]
        )

        # -------------------------------------------------
        # 5️⃣ Ensure SYSTEM hubs exist + auto-join user
        # -------------------------------------------------
        hubs = ensure_system_hubs_and_join(
            user=user,
            admin_units=admin_units,
        )

        # -------------------------------------------------
        # 6️⃣ Fetch ALL LGAs in user's state
        # -------------------------------------------------

        # 6️⃣ Fetch ALL LGAs (ADMIN_2) in user's state from AdminUnit
        from community.models import CommunityHub, HubType

# -------------------------------------------------
# 6️⃣ Fetch ALL LGAs + their community hubs
# -------------------------------------------------

        groups = []

        state_unit = admin_units.get(1)  # ADMIN_1 (State)

        if state_unit:
            lga_units = (
                AdminUnit.objects.filter(
                    level=2,
                    parent=state_unit,
                )
                .select_related("hub")               # SYSTEM hub
                .prefetch_related("hub__children")   # LOCAL hubs
                .order_by("name")
            )

            for lga in lga_units:
                system_hub = getattr(lga, "hub", None)

                subgroups = []
                if system_hub:
                    subgroups = [
                        {
                            "id": str(child.id),
                            "name": child.name,
                        }
                        for child in system_hub.children.filter(
                            hub_type=HubType.LOCAL,
                            is_active=True,
                        ).order_by("name")
                    ]

                groups.append(
                    {
                        "lga": {
                            "id": str(lga.id),
                            "name": lga.name,
                        },
                        "hub": (
                            {
                                "id": str(system_hub.id),
                                "name": system_hub.name,
                                "type": system_hub.hub_type,
                            }
                            if system_hub
                            else None
                        )
                    }
                )



        # -------------------------------------------------
        # 7️⃣ Build response payload
        # -------------------------------------------------
        resolved_payload = {
            "source": source,
            "confidence": confidence,
            "primaryAdminLevel": primary_admin_level,
            "adminUnits": {
                str(level): {
                    "id": str(unit.id),
                    "name": unit.name,
                    "level": level,
                }
                for level, unit in admin_units.items()
            },
            "hubs": {
                str(level): {
                    "id": str(hub.id),
                    "name": hub.name,
                }
                for level, hub in hubs.items()
            },
        }

        return Response(
            {
                "resolvedLocation": resolved_payload,
                "groups": groups,
            },
            status=status.HTTP_200_OK,
        )

class CreateCommunityView(APIView):
    """
    POST /communities/create/

    Body:
    {
      "name": "Estate, Street, School..."
    }

    Creates a LOCAL hub under the user's ADMIN_2 SYSTEM hub
    and makes the creator a LEADER.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        name = (request.data.get("name") or "").strip()

        if not name:
            return Response(
                {"error": "Community name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ Must have a resolved ADMIN_2
        if not getattr(user, "admin_2", None):
            return Response(
                {"error": "Your location must be resolved to ADMIN_2 before creating a community"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ Block weak / untrusted location
        if getattr(user, "location_confidence", "LOW") == "LOW":
            return Response(
                {"error": "Location confidence too low to create a community"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ Optional: if location is stale, force re-resolve
        # Example: require location updated within last 7 days
        updated_at = getattr(user, "location_updated_at", None)
        if updated_at and (timezone.now() - updated_at).days > 7:
            return Response(
                {"error": "Your location is outdated. Please refresh your location and try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ Find the SYSTEM hub linked to user's admin_2
        try:
            admin2_hub = CommunityHub.objects.get(
                hub_type=HubType.SYSTEM,
                admin_unit=user.admin_2,
                is_active=True,
            )
        except CommunityHub.DoesNotExist:
            return Response(
                {"error": "System hub for your location is missing. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # ✅ Prevent duplicates under same parent (recommended)
        exists = CommunityHub.objects.filter(
            hub_type=HubType.LOCAL,
            parent=admin2_hub,
            name__iexact=name,
            is_active=True,
        ).exists()

        if exists:
            return Response(
                {"error": "A community with this name already exists in your area"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # ✅ Create local community hub
            hub = CommunityHub.objects.create(
                name=name,
                hub_type=HubType.LOCAL,
                parent=admin2_hub,
                is_verified=False,
                is_active=True,
            )

            # ✅ Auto join creator as leader
            CommunityMembership.objects.create(
                user=user,
                hub=hub,
                role=MembershipRole.LEADER,
                is_active=True,
            )

        return Response(
            {
                "id": str(hub.id),
                "name": hub.name,
                "createdAt": hub.created_at.isoformat(),
                "parent": {
                    "id": str(admin2_hub.id),
                    "name": admin2_hub.name,
                    "hubType": admin2_hub.hub_type,
                },
            },
            status=status.HTTP_201_CREATED,
        )

class GroupMessagesView(APIView):
    """
    GET  /chat/groups/<group_id>/messages/?cursor=...
    POST /chat/groups/<group_id>/messages/

    GET Response:
    {
      "messages": [...],
      "nextCursor": "..."
    }

    POST Body:
    {
      "text": "hello",
      "tempId": "tmp-123" (optional)
    }

    POST Response:
    {
      "id": "...db_uuid...",
      "tempId": "...",
      "text": "...",
      "createdAt": "...",
      "sender": {...}
    }
    """

    permission_classes = [IsAuthenticated]
    PAGE_SIZE = 30

    def get(self, request, group_id):
        user = request.user

        # ✅ Ensure membership
        if not CommunityMembership.objects.filter(
            user=user, hub_id=group_id, is_active=True
        ).exists():
            return Response(
                {"error": "You are not a member of this hub"},
                status=status.HTTP_403_FORBIDDEN,
            )

        cursor = request.query_params.get("cursor")

        qs = (
            HubMessage.objects.filter(hub_id=group_id)
            .select_related("sender")
            .order_by("-created_at", "-id")
        )

        # ✅ cursor pagination (load older)
        if cursor:
            created_at_str, message_id_str = decode_cursor(cursor)

            if created_at_str and message_id_str:
                try:
                    created_at = timezone.datetime.fromisoformat(created_at_str)
                    if created_at.tzinfo is None:
                        created_at = created_at.replace(tzinfo=timezone.utc)

                    msg_uuid = UUID(message_id_str)

                    qs = qs.filter(
                        Q(created_at__lt=created_at)
                        | Q(created_at=created_at, id__lt=msg_uuid)
                    )
                except Exception:
                    # ignore invalid cursor
                    pass

        # ✅ fetch one extra to know if there's next page
        rows = list(qs[: self.PAGE_SIZE + 1])
        has_more = len(rows) > self.PAGE_SIZE
        rows = rows[: self.PAGE_SIZE]

        # ✅ we want the frontend to render oldest -> newest
        rows.reverse()

        messages = [
            {
                "id": str(m.id),
                "text": m.text,
                "createdAt": m.created_at.isoformat(),
                "sender": {
                    "id": str(m.sender_id),
                    "name": getattr(m.sender, "full_name", None)
                    or m.sender.username,
                    "photo": getattr(m.sender, "photo", None),
                },
                "isMine": str(m.sender_id) == str(user.id),
                "status": "sent",
                "seenBy": [],
            }
            for m in rows
        ]

        next_cursor = None
        if has_more and rows:
            # ✅ next cursor should be based on OLDEST message in this batch
            oldest = rows[0]
            next_cursor = encode_cursor(oldest.created_at, UUID(oldest["id"]) if isinstance(oldest, dict) else oldest.id)

        # ✅ Fix: rows[0] is model not dict
        if has_more and rows:
            oldest_model = HubMessage.objects.get(id=rows[0]["id"]) if isinstance(rows[0], dict) else rows[0]
            next_cursor = encode_cursor(oldest_model.created_at, oldest_model.id)

        return Response(
            {
                "messages": messages,
                "nextCursor": next_cursor,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, group_id):
        user = request.user
        text = (request.data.get("text") or "").strip()
        temp_id = request.data.get("tempId")  # ✅ optional

        if not text:
            return Response(
                {"error": "Message text is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ Ensure membership
        if not CommunityMembership.objects.filter(
            user=user, hub_id=group_id, is_active=True
        ).exists():
            return Response(
                {"error": "You are not a member of this hub"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ✅ Create message in DB
        msg = HubMessage.objects.create(
            hub_id=group_id,
            sender=user,
            text=text,
        )

        payload = {
            "id": str(msg.id),
            "tempId": temp_id,
            "text": msg.text,
            "createdAt": msg.created_at.isoformat(),
            "sender": {
                "id": str(user.id),
                "name": getattr(user, "full_name", None) or user.username,
                "photo": getattr(user, "photo", None),
            },
        }

        # ✅ Broadcast to all members EXCEPT sender (avoid duplicates)
        notify_group(
            group_name=chat_group_name(group_id),
            payload={
                "type": "message:new",
                "payload": {
                    **payload,
                    "excludeSenderId": str(user.id),
                    "isMine": False,
                    "status": "sent",
                },
            },
        )

        return Response(payload, status=status.HTTP_201_CREATED)

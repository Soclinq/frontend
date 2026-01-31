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

        from community.models import CommunityHub, HubType, CommunityMembership

        # ✅ get user's active memberships once
        joined_hubs_qs = CommunityMembership.objects.filter(
            user=request.user,
            is_active=True,
        ).values("hub_id", "role")

        joined_map = {str(m["hub_id"]): m["role"] for m in joined_hubs_qs}

        groups = []
        state_unit = admin_units.get(1)

        if state_unit:
            lga_units = (
                AdminUnit.objects.filter(level=2, parent=state_unit)
                .select_related("hub")
                .prefetch_related("hub__children")
                .order_by("name")
            )

            for lga in lga_units:
                system_hub = getattr(lga, "hub", None)

                # ✅ auto-create system hub if missing
                if not system_hub:
                    system_hub = CommunityHub.objects.create(
                        admin_unit=lga,
                        name=lga.name,
                        hub_type=HubType.SYSTEM,
                        is_active=True,
                        is_verified=True,
                    )

                hubs_payload = []

                if system_hub and system_hub.is_active:
                    # ✅ SYSTEM hub first
                    role = joined_map.get(str(system_hub.id))
                    hubs_payload.append(
                        {
                            "id": str(system_hub.id),
                            "name": system_hub.name,
                            "type": "SYSTEM",
                            "joined": role is not None,
                            "role": role,   # "MEMBER" | "LEADER" | "MODERATOR" | None
                        }
                    )

                    # ✅ LOCAL hubs under system hub
                    local_hubs = system_hub.children.filter(
                        hub_type=HubType.LOCAL,
                        is_active=True,
                    ).order_by("name")

                    for child in local_hubs:
                        child_role = joined_map.get(str(child.id))

                        hubs_payload.append(
                            {
                                "id": str(child.id),
                                "name": child.name,
                                "type": "LOCAL",
                                "joined": child_role is not None,
                                "role": child_role,
                            }
                        )

                groups.append(
                    {
                        "lga": {"id": str(lga.id), "name": lga.name},
                        "hubs": hubs_payload,
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

from uuid import UUID
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from community.models import CommunityMembership, HubMessage, MessageAttachment, MessageType
from community.services import HubMessageSerializer
from websocket.events.socket import notify_group


class GroupMessagesView(APIView):
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
            .exclude(hidden_by__user=user)  # ✅ delete-for-me filter
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
        client_temp_id = request.data.get("clientTempId") or ""
        message_type = request.data.get("messageType") or MessageType.TEXT
        reply_to_id = request.data.get("replyToId")
        attachments = request.data.get("attachments") or []  # array from upload endpoint

        # ✅ Ensure membership
        if not CommunityMembership.objects.filter(
            user=user, hub_id=group_id, is_active=True
        ).exists():
            return Response(
                {"error": "You are not a member of this hub"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ✅ Validate minimal content
        if not text and not attachments:
            return Response(
                {"error": "Message must contain text or attachments"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ Resolve reply_to
        reply_obj = None
        if reply_to_id:
            try:
                reply_obj = HubMessage.objects.filter(hub_id=group_id, id=reply_to_id).first()
            except Exception:
                reply_obj = None

        # ✅ Create message
        msg = HubMessage.objects.create(
            hub_id=group_id,
            sender=user,
            text=text,
            message_type=message_type,
            client_temp_id=client_temp_id,
            reply_to=reply_obj,
        )

        # ✅ Attach uploaded attachments
        # attachments = [{id, type, url, ...}]
        for att in attachments:
            att_id = att.get("id")
            if not att_id:
                continue

            # ✅ Attach only existing attachments (avoid user hacking)
            a = MessageAttachment.objects.filter(id=att_id, message__isnull=True).first()
            if not a:
                continue

            a.message = msg
            a.save()

        # ✅ Serialize for response
        data = HubMessageSerializer(msg, context={"request": request}).data

        # ✅ Broadcast to websocket group
        notify_group(
            group_id=str(group_id),
            payload={
                "type": "message:new",
                "payload": data,
            },
        )

        return Response(data, status=status.HTTP_201_CREATED)



import uuid
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from community.models import MessageAttachment, AttachmentType


def detect_attachment_type(mime: str) -> str:
    if mime.startswith("image/"):
        return AttachmentType.IMAGE
    if mime.startswith("audio/"):
        return AttachmentType.AUDIO
    if mime.startswith("video/"):
        return AttachmentType.VIDEO
    return AttachmentType.FILE


class ChatUploadView(APIView):
    """
    POST /communities/chat/uploads/

    FormData:
      files: File[]  (multiple)

    Response:
    {
      "attachments": [
        {
          "id": "...",
          "type": "IMAGE",
          "url": "https://...",
          "file_name": "...",
          "mime_type": "...",
          ...
        }
      ]
    }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        files = request.FILES.getlist("files")

        if not files:
            return Response(
                {"error": "No files provided"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ⚠️ TEMP: storing locally using Django file storage.
        # In production, use S3 via django-storages or presigned upload.
        saved = []

        for f in files:
            mime = getattr(f, "content_type", "") or ""
            a_type = detect_attachment_type(mime)

            # We create an attachment record WITHOUT message yet
            # (it will later be attached in message POST)
            att = MessageAttachment.objects.create(
                attachment_type=a_type,
                url="",  # will fill after saving file (below)
                file_name=f.name,
                file_size=f.size,
                mime_type=mime,
            )

            # store file via FileField if you used FileField
            # BUT our model uses url+s3_key. For local dev, generate URL:
            # ✅ easiest: change MessageAttachment model to include FileField in dev
            # OR store uploaded file with your own upload system.

            # ✅ For now, return "fake url" placeholder
            # You will replace this with S3 URL later.
            att.url = f"/uploads/chat/{uuid.uuid4()}-{f.name}"
            att.save()

            saved.append(
                {
                    "id": str(att.id),
                    "type": att.attachment_type,
                    "url": att.url,
                    "thumbnailUrl": att.thumbnail_url if hasattr(att, "thumbnail_url") else "",
                    "mimeType": att.mime_type,
                    "fileName": att.file_name,
                    "fileSize": att.file_size,
                    "width": att.width,
                    "height": att.height,
                    "durationMs": att.duration_ms,
                }
            )

        return Response({"attachments": saved}, status=status.HTTP_201_CREATED)


# community/views_chat_reactions.py
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from community.models import HubMessage, MessageReaction
from websocket.events.socket import notify_group

class MessageReactionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        emoji = (request.data.get("emoji") or "").strip()
        if not emoji:
            return Response({"error": "emoji is required"}, status=status.HTTP_400_BAD_REQUEST)

        msg = HubMessage.objects.filter(id=message_id).first()
        if not msg:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)

        # ✅ ensure membership
        if not msg.hub.memberships.filter(user=request.user, is_active=True).exists():
            return Response({"error": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        # toggle reaction
        exists = MessageReaction.objects.filter(message=msg, user=request.user, emoji=emoji).exists()
        if exists:
            MessageReaction.objects.filter(message=msg, user=request.user, emoji=emoji).delete()
            action = "removed"
        else:
            MessageReaction.objects.create(message=msg, user=request.user, emoji=emoji)
            action = "added"

        payload = {
            "messageId": str(msg.id),
            "emoji": emoji,
            "userId": str(request.user.id),
            "action": action,
        }

        notify_group(
            group_id=str(msg.hub_id),
            payload={"type": "reaction:update", "payload": payload},
        )

        return Response(payload, status=status.HTTP_200_OK)


from datetime import timedelta
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from community.models import HubMessage
from websocket.events.socket import notify_group

from datetime import timedelta
from django.utils import timezone

def can_force_delete(user, hub_id: str):
    if user.is_staff or user.is_superuser:
        return True

    return CommunityMembership.objects.filter(
        user=user,
        hub_id=hub_id,
        role__in=["MODERATOR", "LEADER"],
        is_active=True,
    ).exists()


class MessageDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, message_id):
        msg = HubMessage.objects.select_related("hub").filter(id=message_id).first()
        if not msg:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)
        
        is_sender = str(msg.sender_id) == str(request.user.id)

        # ✅ sender window
        sender_can_delete = is_sender and (timezone.now() - msg.created_at <= timedelta(hours=1))

        # ✅ moderators can delete anytime
        mod_can_delete = can_force_delete(request.user, msg.hub_id)

        if not (sender_can_delete or mod_can_delete):
            return Response({"error": "Not allowed to delete this message"}, status=status.HTTP_403_FORBIDDEN)

        # ✅ must be sender
        if str(msg.sender_id) != str(request.user.id):
            return Response({"error": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        # ✅ time limit: 1 hour
        if timezone.now() - msg.created_at > timedelta(hours=1):
            return Response({"error": "Delete window expired (1 hour max)"}, status=status.HTTP_400_BAD_REQUEST)

        hub_id = str(msg.hub_id)

        # ✅ soft delete recommended
        msg.deleted_at = timezone.now()
        msg.save(update_fields=["deleted_at"])


        # ✅ notify websocket
        notify_group(
            group_id=str(msg.hub_id),
            payload={
                "type": "message:delete",
                "payload": {
                    "messageId": str(msg.id),
                    "deletedAt": msg.deleted_at.isoformat(),
                },
            },
        )


        return Response({"ok": True}, status=status.HTTP_200_OK)


from datetime import timedelta
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from community.models import HubMessage
from community.services import HubMessageSerializer
from websocket.events.socket import notify_group


class MessageEditView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, message_id):
        msg = HubMessage.objects.select_related("hub").filter(id=message_id).first()
        if not msg:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)

        if str(msg.sender_id) != str(request.user.id):
            return Response({"error": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        # ✅ time limit: 20 mins
        if timezone.now() - msg.created_at > timedelta(minutes=20):
            return Response({"error": "Edit window expired (20 minutes max)"}, status=status.HTTP_400_BAD_REQUEST)

        text = (request.data.get("text") or "").strip()
        if not text:
            return Response({"error": "Text is required"}, status=status.HTTP_400_BAD_REQUEST)

        msg.text = text
        msg.edited_at = timezone.now()
        msg.save(update_fields=["text", "edited_at"])


        data = HubMessageSerializer(msg, context={"request": request}).data

        notify_group(
            group_id=str(msg.hub_id),
            payload={"type": "message:edit", "payload": data},
        )

        return Response(data, status=status.HTTP_200_OK)


from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from community.models import HubMessage, HubMessageHidden


class MessageDeleteForMeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        msg = HubMessage.objects.filter(id=message_id).first()
        if not msg:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)

        HubMessageHidden.objects.get_or_create(message=msg, user=request.user)

        return Response({"ok": True}, status=status.HTTP_200_OK)


from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from community.models import HubMessage, CommunityMembership, HubMessageReceipt, HubMessageReaction


class MessageInfoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, message_id):
        msg = HubMessage.objects.select_related("hub", "sender").filter(id=message_id).first()
        if not msg:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)

        # ✅ must be a member of hub
        if not CommunityMembership.objects.filter(user=request.user, hub_id=msg.hub_id, is_active=True).exists():
            return Response({"error": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        # ✅ receipts (delivered/read)
        receipts = (
            HubMessageReceipt.objects.select_related("user")
            .filter(message=msg)
            .order_by("-read_at", "-delivered_at")
        )

        delivered = []
        read = []

        for r in receipts:
            u = r.user
            base = {
                "user": {
                    "id": str(u.id),
                    "name": getattr(u, "full_name", None) or u.username,
                    "photo": getattr(u, "photo", None),
                }
            }

            if r.delivered_at:
                delivered.append({**base, "deliveredAt": r.delivered_at.isoformat()})
            if r.read_at:
                read.append({**base, "readAt": r.read_at.isoformat()})

        # ✅ reactions by who
        reaction_items = (
            HubMessageReaction.objects.select_related("user")
            .filter(message=msg)
            .order_by("-created_at")
        )

        reactions = [
            {
                "emoji": rx.emoji,
                "createdAt": rx.created_at.isoformat(),
                "user": {
                    "id": str(rx.user.id),
                    "name": getattr(rx.user, "full_name", None) or rx.user.username,
                    "photo": getattr(rx.user, "photo", None),
                },
            }
            for rx in reaction_items
        ]

        return Response(
            {
                "message": {
                    "id": str(msg.id),
                    "text": msg.text,
                    "createdAt": msg.created_at.isoformat(),
                    "editedAt": msg.edited_at.isoformat() if msg.edited_at else None,
                    "deletedAt": msg.deleted_at.isoformat() if msg.deleted_at else None,
                    "sender": {
                        "id": str(msg.sender.id),
                        "name": getattr(msg.sender, "full_name", None) or msg.sender.username,
                        "photo": getattr(msg.sender, "photo", None),
                    },
                },
                "delivered": delivered,
                "read": read,
                "reactions": reactions,
            },
            status=status.HTTP_200_OK,
        )


from uuid import UUID
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from community.models import CommunityHub, CommunityMembership, HubMessage, MessageAttachment
from community.services import HubMessageSerializer
from websocket.events.socket import notify_group


class MessageForwardView(APIView):
    """
    POST /communities/chat/messages/<message_id>/forward/

    Body:
    {
      "targetHubIds": ["uuid1", "uuid2"]
    }

    ✅ clones message + clones attachments into each hub
    ✅ broadcasts message:new into each target hub ws group
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        user = request.user

        target_hub_ids = request.data.get("targetHubIds") or []
        if not isinstance(target_hub_ids, list) or not target_hub_ids:
            return Response(
                {"error": "targetHubIds must be a non-empty array"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ Load source message
        src = (
            HubMessage.objects.select_related("hub", "sender", "reply_to")
            .prefetch_related("attachments")
            .filter(id=message_id)
            .first()
        )

        if not src:
            return Response(
                {"error": "Message not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # ✅ Security: user must be a member of the source hub
        if not CommunityMembership.objects.filter(
            user=user, hub_id=src.hub_id, is_active=True
        ).exists():
            return Response(
                {"error": "You are not allowed to forward from this hub"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ✅ Normalize UUIDs
        parsed_ids = []
        for raw in target_hub_ids:
            try:
                parsed_ids.append(UUID(str(raw)))
            except Exception:
                continue

        if not parsed_ids:
            return Response(
                {"error": "No valid target hub IDs"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ fetch hubs
        hubs = CommunityHub.objects.filter(id__in=parsed_ids, is_active=True)
        hub_map = {h.id: h for h in hubs}

        forwarded_count = 0
        forwarded_messages = []  # optional

        # ✅ bulk forward safely
        for hub_id in parsed_ids:
            hub = hub_map.get(hub_id)
            if not hub:
                continue

            # ✅ Membership check per target hub
            if not CommunityMembership.objects.filter(
                user=user, hub_id=hub.id, is_active=True
            ).exists():
                continue

            # ✅ prevent forwarding into same hub (optional)
            # if hub.id == src.hub_id:
            #     continue

            with transaction.atomic():
                # ✅ clone message
                new_msg = HubMessage.objects.create(
                    hub_id=hub.id,
                    sender=user,
                    text=src.text or "",
                    message_type=src.message_type,
                    reply_to=src.reply_to if src.reply_to_id else None,

                    # ✅ OPTIONAL fields if you added them
                    # forwarded_from=src,
                    # is_forwarded=True,
                )

                # ✅ clone attachments (same S3 URLs)
                for a in src.attachments.all():
                    MessageAttachment.objects.create(
                        message=new_msg,
                        attachment_type=a.attachment_type,
                        url=a.url,
                        thumbnail_url=getattr(a, "thumbnail_url", "") or "",
                        mime_type=getattr(a, "mime_type", "") or "",
                        file_name=getattr(a, "file_name", "") or "",
                        file_size=getattr(a, "file_size", None),
                        width=getattr(a, "width", None),
                        height=getattr(a, "height", None),
                        duration_ms=getattr(a, "duration_ms", None),
                    )

                forwarded_count += 1

                # ✅ serialize response payload
                payload = HubMessageSerializer(
                    new_msg, context={"request": request}
                ).data

                forwarded_messages.append(payload)

                # ✅ websocket broadcast to target hub group
                notify_group(
                    group_name=chat_group_name(str(hub.id)),
                    payload={
                        "type": "message:new",
                        "payload": payload,
                    },
                )

        if forwarded_count == 0:
            return Response(
                {"error": "No hubs forwarded. (not a member / invalid hubs)"},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {
                "success": True,
                "forwarded": forwarded_count,
                # optional, return created messages
                "messages": forwarded_messages,
            },
            status=status.HTTP_200_OK,
        )

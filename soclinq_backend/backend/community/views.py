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
    HubType, HubMessage, PrivateMessage,
    PrivateConversationMember, PrivateConversation, UserBlock
)

from accounts.models import User 



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

from django.contrib.gis.geos import Point
from django.utils import timezone
from django.db.models import Count, Max

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from community.models import AdminUnit, CommunityHub, HubType, CommunityMembership, HubMessage, HubReadReceipt
from community.serializers import HubSerializer

class NearbyCommunitiesByLocationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
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

        # ✅ Resolve location
        resolver = LocationResolver(lat=lat, lng=lng, country_code=country_code)
        resolved = resolver.resolve()

        admin_units = resolved.admin_units
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

        # ✅ primary admin level
        if 2 in admin_units:
            primary_admin_level = 2
        elif 1 in admin_units:
            primary_admin_level = 1
        else:
            primary_admin_level = 0

        # ✅ persist
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

        # ✅ ensure system hubs exist for current admin units
        hubs_by_level = ensure_system_hubs_and_join(user=user, admin_units=admin_units)

        # ✅ user memberships
        joined_rows = (
            CommunityMembership.objects.filter(user=user, is_active=True)
            .values("hub_id", "role")
        )
        joined_map = {str(r["hub_id"]): r["role"] for r in joined_rows}

        groups = []
        state_unit = admin_units.get(1)

        if state_unit:
            lga_units = (
                AdminUnit.objects.filter(level=2, parent=state_unit)
                .select_related("hub")
                .prefetch_related("hub__children")
                .order_by("name")
            )

            # ✅ collect all hub ids for bulk stats
            all_hubs = []
            for lga in lga_units:
                system_hub = getattr(lga, "hub", None)

                if not system_hub:
                    system_hub = CommunityHub.objects.create(
                        admin_unit=lga,
                        name=lga.name,
                        hub_type=HubType.SYSTEM,
                        is_active=True,
                        is_verified=True,
                    )

                all_hubs.append(system_hub)

                local_hubs = list(
                    system_hub.children.filter(
                        hub_type=HubType.LOCAL,
                        is_active=True,
                    ).order_by("name")
                )
                all_hubs.extend(local_hubs)

            hub_ids = [h.id for h in all_hubs]

            # ✅ members_count (bulk)
            members_rows = (
                CommunityMembership.objects.filter(hub_id__in=hub_ids, is_active=True)
                .values("hub_id")
                .annotate(cnt=Count("id"))
            )
            members_map = {str(r["hub_id"]): r["cnt"] for r in members_rows}

            # ✅ last message preview (bulk)
            last_msg_time_rows = (
                HubMessage.objects.filter(hub_id__in=hub_ids)
                .values("hub_id")
                .annotate(last_at=Max("created_at"))
            )
            last_at_map = {str(r["hub_id"]): r["last_at"] for r in last_msg_time_rows}

            last_messages = (
                HubMessage.objects.filter(hub_id__in=hub_ids)
                .select_related("sender")
                .order_by("-created_at")
            )

            last_msg_map = {}
            for msg in last_messages:
                hid = str(msg.hub_id)
                if hid not in last_msg_map:
                    last_msg_map[hid] = msg

            # ✅ unread_count (per hub)
            receipts_rows = (
                HubReadReceipt.objects.filter(user=user, hub_id__in=hub_ids)
                .values("hub_id", "last_seen_at")
            )
            last_seen_map = {str(r["hub_id"]): r["last_seen_at"] for r in receipts_rows}

            unread_map = {}
            for h in hub_ids:
                hid = str(h)
                last_seen = last_seen_map.get(hid)

                if not last_seen:
                    unread_map[hid] = HubMessage.objects.filter(hub_id=h).count()
                else:
                    unread_map[hid] = HubMessage.objects.filter(
                        hub_id=h, created_at__gt=last_seen
                    ).count()

            # ✅ build LGA groups
            for lga in lga_units:
                system_hub = getattr(lga, "hub", None)
                if not system_hub:
                    continue

                # ✅ build list: system + locals
                local_hubs = list(
                    system_hub.children.filter(
                        hub_type=HubType.LOCAL,
                        is_active=True,
                    ).order_by("name")
                )

                hub_list = [system_hub] + local_hubs

                hubs_payload = []
                for hub in hub_list:
                    base = HubSerializer(hub).data
                    role = joined_map.get(str(hub.id))
                    last_msg = last_msg_map.get(str(hub.id))

                    base.update(
                        {
                            "user_joined": role is not None,
                            "user_role": role,

                            "members_count": members_map.get(str(hub.id), 0),
                            "online_count": 0,
                            "unread_count": unread_map.get(str(hub.id), 0),

                            "last_message_text": getattr(last_msg, "text", None) if last_msg else None,
                            "last_message_type": getattr(last_msg, "message_type", None) if last_msg else None,
                            "last_message_at": last_msg.created_at.isoformat() if last_msg else None,
                            "last_message_sender_name": (
                                getattr(last_msg.sender, "username", None)
                                if last_msg and last_msg.sender
                                else None
                            ),

                            "pinned_message_id": None,
                        }
                    )

                    hubs_payload.append(base)

                groups.append(
                    {
                        "lga": {"id": str(lga.id), "name": lga.name},
                        "hubs": hubs_payload,
                    }
                )

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
                str(level): {"id": str(hub.id), "name": hub.name}
                for level, hub in hubs_by_level.items()
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


class BulkCommunityMessageForwardView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        target_hub_ids = request.data.get("targetIds") or []
        source_hub_id = request.data.get("fromThreadId")
        raw_messages = request.data.get("messages") or []
        message_ids = [str(m.get("id")) for m in raw_messages if isinstance(m, dict) and m.get("id")]

        if not isinstance(target_hub_ids, list) or not target_hub_ids or not message_ids:
            return Response(
                {"error": "targetIds and messages are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        parsed_target_ids = []
        for raw in target_hub_ids:
            try:
                parsed_target_ids.append(UUID(str(raw)))
            except Exception:
                continue

        parsed_message_ids = []
        for raw in message_ids:
            try:
                parsed_message_ids.append(UUID(str(raw)))
            except Exception:
                continue

        if not parsed_target_ids or not parsed_message_ids:
            return Response(
                {"error": "No valid target or message IDs"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        src_messages = (
            HubMessage.objects.select_related("hub", "reply_to")
            .prefetch_related("attachments")
            .filter(id__in=parsed_message_ids)
        )
        if source_hub_id:
            src_messages = src_messages.filter(hub_id=source_hub_id)

        src_list = list(src_messages)
        if not src_list:
            return Response({"error": "No forwardable messages found"}, status=status.HTTP_404_NOT_FOUND)

        source_hub_ids = {m.hub_id for m in src_list}
        allowed_source_hubs = set(
            CommunityMembership.objects.filter(
                user=user,
                hub_id__in=source_hub_ids,
                is_active=True,
            ).values_list("hub_id", flat=True)
        )
        src_list = [m for m in src_list if m.hub_id in allowed_source_hubs]
        if not src_list:
            return Response({"error": "Not allowed to forward selected messages"}, status=status.HTTP_403_FORBIDDEN)

        allowed_target_hubs = set(
            CommunityMembership.objects.filter(
                user=user,
                hub_id__in=parsed_target_ids,
                is_active=True,
            ).values_list("hub_id", flat=True)
        )

        created_payloads = []
        for target_hub_id in parsed_target_ids:
            if target_hub_id not in allowed_target_hubs:
                continue

            for src in src_list:
                with transaction.atomic():
                    new_msg = HubMessage.objects.create(
                        hub_id=target_hub_id,
                        sender=user,
                        text=src.text or "",
                        message_type=src.message_type,
                        reply_to=src.reply_to if src.reply_to_id else None,
                        forwarded_from=src,
                        is_forwarded=True,
                    )

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

                    payload = HubMessageSerializer(new_msg, context={"request": request}).data
                    created_payloads.append(payload)

                    notify_group(
                        group_name=chat_group_name(str(target_hub_id)),
                        payload={"type": "message:new", "payload": payload},
                    )

        if not created_payloads:
            return Response(
                {"error": "No messages were forwarded"},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {
                "success": True,
                "forwarded": len(created_payloads),
                "messages": created_payloads,
            },
            status=status.HTTP_200_OK,
        )


from django.db.models import Q, Count, Max
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from community.models import (
    CommunityHub,
    CommunityMembership,
    HubMessage,
    HubReadReceipt,
    HubType,
)
from community.serializers import HubSerializer


class CommunityHubSearchView(APIView):
    """
    GET /communities/search/?q=<text>

    Returns:
    {
      "hubs": [HubPayload...]
    }
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        q = (request.query_params.get("q") or "").strip()

        if not q:
            return Response({"hubs": []}, status=status.HTTP_200_OK)

        # ✅ hub search (simple + fast)
        hubs_qs = (
            CommunityHub.objects.filter(is_active=True)
            .filter(
                Q(name__icontains=q)
                | Q(category__icontains=q)
                | Q(description__icontains=q)
            )
            .order_by("-is_verified", "name")[:20]
        )

        hubs = list(hubs_qs)
        hub_ids = [h.id for h in hubs]

        # ✅ joined state
        joined_rows = (
            CommunityMembership.objects.filter(user=user, is_active=True, hub_id__in=hub_ids)
            .values("hub_id", "role")
        )
        joined_map = {str(r["hub_id"]): r["role"] for r in joined_rows}

        # ✅ members_count
        members_rows = (
            CommunityMembership.objects.filter(hub_id__in=hub_ids, is_active=True)
            .values("hub_id")
            .annotate(cnt=Count("id"))
        )
        members_map = {str(r["hub_id"]): r["cnt"] for r in members_rows}

        # ✅ last message preview
        last_messages = (
            HubMessage.objects.filter(hub_id__in=hub_ids)
            .select_related("sender")
            .order_by("-created_at")
        )

        last_msg_map = {}
        for msg in last_messages:
            hid = str(msg.hub_id)
            if hid not in last_msg_map:
                last_msg_map[hid] = msg

        # ✅ unread_count
        receipts_rows = (
            HubReadReceipt.objects.filter(user=user, hub_id__in=hub_ids)
            .values("hub_id", "last_seen_at")
        )
        last_seen_map = {str(r["hub_id"]): r["last_seen_at"] for r in receipts_rows}

        unread_map = {}
        for hub in hubs:
            hid = str(hub.id)
            last_seen = last_seen_map.get(hid)

            if not last_seen:
                unread_map[hid] = HubMessage.objects.filter(hub=hub).count()
            else:
                unread_map[hid] = HubMessage.objects.filter(
                    hub=hub,
                    created_at__gt=last_seen,
                ).count()

        # ✅ response hubs
        payload = []
        for hub in hubs:
            base = HubSerializer(hub).data
            role = joined_map.get(str(hub.id))
            last_msg = last_msg_map.get(str(hub.id))

            base.update(
                {
                    "user_joined": role is not None,
                    "user_role": role,
                    "members_count": members_map.get(str(hub.id), 0),
                    "online_count": 0,
                    "unread_count": unread_map.get(str(hub.id), 0),

                    "last_message_text": getattr(last_msg, "text", None) if last_msg else None,
                    "last_message_type": getattr(last_msg, "message_type", None) if last_msg else None,
                    "last_message_at": last_msg.created_at.isoformat() if last_msg else None,
                    "last_message_sender_name": (
                        getattr(last_msg.sender, "username", None)
                        if last_msg and last_msg.sender
                        else None
                    ),

                    "pinned_message_id": None,
                }
            )

            payload.append(base)

        return Response({"hubs": payload}, status=status.HTTP_200_OK)


from django.db import transaction
from django.db.models import Count

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from community.models import (
    CommunityHub,
    CommunityMembership,
    MembershipRole,
)
from community.serializers import HubSerializer


class JoinCommunityHubView(APIView):
    """
    POST /communities/<hub_id>/join/

    Rules:
    - PUBLIC + OPEN => join immediately
    - PRIVATE / INVITE_ONLY => block or request (future)
    - REQUEST / APPROVAL => return "pending" (future)
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, hub_id):
        user = request.user

        try:
            hub = CommunityHub.objects.get(id=hub_id)
        except CommunityHub.DoesNotExist:
            return Response({"error": "Hub not found"}, status=status.HTTP_404_NOT_FOUND)

        if not hub.is_active:
            return Response({"error": "Hub is not active"}, status=status.HTTP_403_FORBIDDEN)

        # ✅ privacy enforcement
        if hub.privacy == "INVITE_ONLY":
            return Response(
                {"error": "This hub is invite-only"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if hub.privacy == "PRIVATE":
            # ✅ for now block private hubs
            # later: create a HubJoinRequest model
            return Response(
                {"error": "This hub is private. Join request required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ✅ join mode enforcement
        if hub.join_mode in ["REQUEST", "APPROVAL"]:
            return Response(
                {
                    "error": "This hub requires approval to join.",
                    "join_mode": hub.join_mode,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # ✅ max members enforcement
        if hub.max_members:
            current_members = CommunityMembership.objects.filter(hub=hub, is_active=True).count()
            if current_members >= hub.max_members:
                return Response(
                    {"error": "Hub is full"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # ✅ join/create membership
        with transaction.atomic():
            membership, created = CommunityMembership.objects.get_or_create(
                user=user,
                hub=hub,
                defaults={"role": MembershipRole.MEMBER, "is_active": True},
            )

            if not created and not membership.is_active:
                membership.is_active = True
                membership.save(update_fields=["is_active"])

        # ✅ recompute members_count (optional but nice)
        members_count = CommunityMembership.objects.filter(hub=hub, is_active=True).count()

        # ✅ response hub payload
        base = HubSerializer(hub).data
        base.update(
            {
                "user_joined": True,
                "user_role": membership.role,
                "members_count": members_count,
                "online_count": 0,
                "unread_count": 0,

                "last_message_text": None,
                "last_message_type": None,
                "last_message_at": None,
                "last_message_sender_name": None,

                "pinned_message_id": None,
            }
        )

        return Response(
            {
                "message": "Joined successfully",
                "hub": base,
            },
            status=status.HTTP_200_OK,
        )


from django.db.models import OuterRef, Subquery, Count, Value, Q, F, Case, When
from django.db.models.functions import Coalesce
from django.utils.dateparse import parse_datetime


class PrivateInboxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        try:
            blocked_ids = list(
                UserBlock.objects.filter(blocker=user).values_list("blocked_id", flat=True)
            )
            blocked_by_ids = list(
                UserBlock.objects.filter(blocked=user).values_list("blocker_id", flat=True)
            )

            qs = (
                PrivateConversationMember.objects
                .select_related("conversation", "conversation__user1", "conversation__user2")
                .filter(user=user)
                .filter(conversation__is_active=True)
            )

            last_msg_subq = (
                PrivateMessage.objects
                .filter(conversation_id=OuterRef("conversation_id"))
                .filter(deleted_at__isnull=True)
                .order_by("-created_at")
            )

            qs = qs.annotate(
                last_message_text=Subquery(last_msg_subq.values("text")[:1]),
                last_message_at=Subquery(last_msg_subq.values("created_at")[:1]),
            )

            unread_subq = (
                PrivateMessage.objects
                .filter(conversation_id=OuterRef("conversation_id"))
                .filter(deleted_at__isnull=True)
                .exclude(sender_id=user.id)
                .filter(
                    created_at__gt=Coalesce(
                        OuterRef("last_read_at"),
                        Value("1970-01-01T00:00:00Z"),
                    )
                )
                .values("conversation_id")
                .annotate(c=Count("id"))
                .values("c")[:1]
            )

            qs = qs.annotate(
                unread_count=Coalesce(Subquery(unread_subq), Value(0)),
                other_user_id=Case(
                    When(conversation__user1_id=user.id, then=F("conversation__user2_id")),
                    default=F("conversation__user1_id"),
                ),
            )

            qs = qs.exclude(other_user_id__in=blocked_ids).exclude(other_user_id__in=blocked_by_ids)

            qs = qs.order_by(
                F("pinned_at").desc(nulls_last=True),
                F("last_message_at").desc(nulls_last=True),
                F("created_at").desc(),
            )

            conversations = []
            for m in qs[:250]:
                convo = m.conversation
                other_user = convo.user2 if convo.user1_id == user.id else convo.user1

                conversations.append(
                    {
                        "conversation_id": str(convo.id),
                        "other_user": {
                            "id": str(other_user.id),
                            "name": getattr(other_user, "get_full_name", lambda: "")() or getattr(other_user, "username", "User"),
                            "photo": getattr(other_user, "photo", None) if hasattr(other_user, "photo") else None,
                        },
                        "last_message_text": m.last_message_text,
                        "last_message_at": m.last_message_at,
                        "unread_count": int(m.unread_count or 0),
                    }
                )

            return Response(
                {
                    "conversations": conversations,
                    "count": len(conversations),
                },
                status=status.HTTP_200_OK,
            )

        except Exception:
            return Response(
                {"error": "Unable to load private inbox"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

def _clean_query(q: str) -> str:
    q = (q or "").strip()
    q = q.replace("\n", " ").replace("\t", " ")
    while "  " in q:
        q = q.replace("  ", " ")
    return q


def _normalize_phone(value: str) -> str:
    if not value:
        return ""

    digits = "".join(ch for ch in value if ch.isdigit())

    # ✅ Nigeria normalization: 0803... -> 234803...
    if digits.startswith("0") and len(digits) >= 10:
        digits = "234" + digits[1:]

    return digits


class NewChatSearchUsersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        try:
            q = _clean_query(request.query_params.get("q", ""))

            if not q:
                return Response({"users": []}, status=status.HTTP_200_OK)

            q_no_at = q[1:] if q.startswith("@") else q
            q_lower = q_no_at.lower()

            phone_digits = _normalize_phone(q_no_at)

            # ✅ block logic
            blocked_ids = list(
                UserBlock.objects.filter(blocker=user).values_list("blocked_id", flat=True)
            )
            blocked_by_ids = list(
                UserBlock.objects.filter(blocked=user).values_list("blocker_id", flat=True)
            )

            # ✅ base queryset
            qs = (
                User.objects
                .filter(is_active=True, is_suspended=False)
                .exclude(id=user.id)
            )

            # ✅ IMPORTANT: hide users who opted out of visibility
            qs = qs.filter(
                Q(profile_settings__searchable_by_username=True) |
                Q(profile_settings__isnull=True)
            )

            # ✅ exclude blocked
            qs = qs.exclude(id__in=blocked_ids).exclude(id__in=blocked_by_ids)

            # ✅ strong multi-field search
            query = Q()
            query |= Q(username__iexact=q_no_at)
            query |= Q(username__icontains=q_no_at)
            query |= Q(full_name__icontains=q_no_at)
            query |= Q(phone_number__icontains=q_no_at)
            query |= Q(email__icontains=q_no_at)

            if phone_digits:
                query |= Q(phone_number__icontains=phone_digits)
                if len(phone_digits) >= 10:
                    query |= Q(phone_number__icontains=phone_digits[-10:])

            qs = qs.filter(query).distinct()
            qs = qs.only("id", "full_name", "username", "phone_number", "email", "live_photo")[:50]

            users = list(qs)

            # ✅ ranking
            def rank(u: User):
                uname = (u.username or "").lower()
                name = (u.full_name or "").lower()

                if uname == q_lower:
                    return 0
                if uname.startswith(q_lower):
                    return 1
                if q_lower in uname:
                    return 2
                if q_lower in name:
                    return 3
                return 9

            users.sort(key=rank)

            payload = []
            for u in users:
                payload.append(
                    {
                        "id": str(u.id),
                        "name": u.full_name or u.username or "User",
                        "username": u.username,
                        "phone": u.phone_number,
                        "email": u.email,
                        "photo": u.live_photo.url if u.live_photo else None,
                    }
                )

            return Response({"users": payload}, status=status.HTTP_200_OK)

        except Exception:
            return Response(
                {"error": "Unable to search users"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )




class OpenPrivateConversationView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        user = request.user

        try:
            other_user_id = request.data.get("user_id")

            if not other_user_id:
                return Response(
                    {"error": "user_id is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if str(other_user_id) == str(user.id):
                return Response(
                    {"error": "You cannot chat with yourself"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # ✅ ensure target exists
            try:
                other = User.objects.get(id=other_user_id, is_active=True, is_suspended=False)
            except User.DoesNotExist:
                return Response(
                    {"error": "User not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # ✅ block checks
            blocked = UserBlock.objects.filter(blocker=user, blocked=other).exists()
            blocked_by = UserBlock.objects.filter(blocker=other, blocked=user).exists()

            if blocked or blocked_by:
                return Response(
                    {"error": "You cannot start a chat with this user"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # ✅ find existing convo (both directions)
            convo = (
                PrivateConversation.objects
                .filter(is_active=True)
                .filter(
                    Q(user1=user, user2=other) |
                    Q(user1=other, user2=user)
                )
                .first()
            )

            if convo:
                # ✅ ensure membership rows exist (safety)
                PrivateConversationMember.objects.get_or_create(conversation=convo, user=user)
                PrivateConversationMember.objects.get_or_create(conversation=convo, user=other)

                return Response(
                    {"conversation_id": str(convo.id), "created": False},
                    status=status.HTTP_200_OK,
                )

            # ✅ create new convo
            convo = PrivateConversation.objects.create(
                user1=user,
                user2=other,
                is_active=True,
            )

            # ✅ create membership rows
            PrivateConversationMember.objects.create(conversation=convo, user=user)
            PrivateConversationMember.objects.create(conversation=convo, user=other)

            return Response(
                {"conversation_id": str(convo.id), "created": True},
                status=status.HTTP_200_OK,
            )

        except Exception:
            return Response(
                {"error": "Unable to open private chat"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

from django.db import transaction
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from accounts.models import User
from community.models import UserBlock, PrivateConversationMember, PrivateConversation


class OpenPrivateConversationView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        user = request.user

        user_id = request.data.get("user_id")

        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        if str(user_id) == str(user.id):
            return Response({"error": "You cannot chat with yourself"}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ make sure other user exists
        try:
            other = User.objects.get(id=user_id, is_active=True, is_suspended=False)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        # ✅ block checks
        if UserBlock.objects.filter(blocker=user, blocked=other).exists():
            return Response({"error": "You blocked this user"}, status=status.HTTP_403_FORBIDDEN)

        if UserBlock.objects.filter(blocker=other, blocked=user).exists():
            return Response({"error": "This user blocked you"}, status=status.HTTP_403_FORBIDDEN)

        # ✅ check existing conversation both ways
        convo = (
            PrivateConversation.objects
            .filter(is_active=True)
            .filter(
                Q(user1=user, user2=other) |
                Q(user1=other, user2=user)
            )
            .first()
        )

        # ✅ create if missing
        if not convo:
            convo = PrivateConversation.objects.create(
                user1=user,
                user2=other,
                is_active=True,
            )

        # ✅ ensure members exist
        PrivateConversationMember.objects.get_or_create(conversation=convo, user=user)
        PrivateConversationMember.objects.get_or_create(conversation=convo, user=other)

        return Response(
            {"conversation_id": str(convo.id)},
            status=status.HTTP_200_OK,
        )


class BulkCommunityMessageForwardView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        target_hub_ids = request.data.get("targetIds") or []
        source_hub_id = request.data.get("fromThreadId")
        raw_messages = request.data.get("messages") or []
        message_ids = [str(m.get("id")) for m in raw_messages if isinstance(m, dict) and m.get("id")]

        if not isinstance(target_hub_ids, list) or not target_hub_ids or not message_ids:
            return Response(
                {"error": "targetIds and messages are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        parsed_target_ids = []
        for raw in target_hub_ids:
            try:
                parsed_target_ids.append(UUID(str(raw)))
            except Exception:
                continue

        parsed_message_ids = []
        for raw in message_ids:
            try:
                parsed_message_ids.append(UUID(str(raw)))
            except Exception:
                continue

        if not parsed_target_ids or not parsed_message_ids:
            return Response(
                {"error": "No valid target or message IDs"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        src_messages = (
            HubMessage.objects.select_related("hub", "reply_to")
            .prefetch_related("attachments")
            .filter(id__in=parsed_message_ids)
        )
        if source_hub_id:
            src_messages = src_messages.filter(hub_id=source_hub_id)

        src_list = list(src_messages)
        if not src_list:
            return Response({"error": "No forwardable messages found"}, status=status.HTTP_404_NOT_FOUND)

        source_hub_ids = {m.hub_id for m in src_list}
        allowed_source_hubs = set(
            CommunityMembership.objects.filter(
                user=user,
                hub_id__in=source_hub_ids,
                is_active=True,
            ).values_list("hub_id", flat=True)
        )
        src_list = [m for m in src_list if m.hub_id in allowed_source_hubs]
        if not src_list:
            return Response({"error": "Not allowed to forward selected messages"}, status=status.HTTP_403_FORBIDDEN)

        allowed_target_hubs = set(
            CommunityMembership.objects.filter(
                user=user,
                hub_id__in=parsed_target_ids,
                is_active=True,
            ).values_list("hub_id", flat=True)
        )

        created_payloads = []
        for target_hub_id in parsed_target_ids:
            if target_hub_id not in allowed_target_hubs:
                continue

            for src in src_list:
                with transaction.atomic():
                    new_msg = HubMessage.objects.create(
                        hub_id=target_hub_id,
                        sender=user,
                        text=src.text or "",
                        message_type=src.message_type,
                        reply_to=src.reply_to if src.reply_to_id else None,
                        forwarded_from=src,
                        is_forwarded=True,
                    )

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

                    payload = HubMessageSerializer(new_msg, context={"request": request}).data
                    created_payloads.append(payload)

                    notify_group(
                        group_name=chat_group_name(str(target_hub_id)),
                        payload={"type": "message:new", "payload": payload},
                    )

        if not created_payloads:
            return Response(
                {"error": "No messages were forwarded"},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {
                "success": True,
                "forwarded": len(created_payloads),
                "messages": created_payloads,
            },
            status=status.HTTP_200_OK,
        )
from community.models import PrivateMessageAttachment


class BulkPrivateMessageForwardView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        target_conversation_ids = request.data.get("targetIds") or []
        source_conversation_id = request.data.get("fromThreadId")
        raw_messages = request.data.get("messages") or []
        message_ids = [str(m.get("id")) for m in raw_messages if isinstance(m, dict) and m.get("id")]

        if not isinstance(target_conversation_ids, list) or not target_conversation_ids or not message_ids:
            return Response(
                {"error": "targetIds and messages are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        parsed_target_ids = []
        for raw in target_conversation_ids:
            try:
                parsed_target_ids.append(UUID(str(raw)))
            except Exception:
                continue

        parsed_message_ids = []
        for raw in message_ids:
            try:
                parsed_message_ids.append(UUID(str(raw)))
            except Exception:
                continue

        if not parsed_target_ids or not parsed_message_ids:
            return Response(
                {"error": "No valid target or message IDs"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        src_messages = (
            PrivateMessage.objects.select_related("sender", "conversation", "reply_to")
            .prefetch_related("attachments")
            .filter(id__in=parsed_message_ids, deleted_at__isnull=True)
        )

        if source_conversation_id:
            src_messages = src_messages.filter(conversation_id=source_conversation_id)

        src_list = list(src_messages)
        if not src_list:
            return Response({"error": "No forwardable messages found"}, status=status.HTTP_404_NOT_FOUND)

        allowed_source_conversations = set(
            PrivateConversationMember.objects.filter(
                user=user,
                conversation_id__in={m.conversation_id for m in src_list},
            ).values_list("conversation_id", flat=True)
        )

        src_list = [m for m in src_list if m.conversation_id in allowed_source_conversations]
        if not src_list:
            return Response({"error": "Not allowed to forward selected messages"}, status=status.HTTP_403_FORBIDDEN)

        allowed_target_conversations = set(
            PrivateConversationMember.objects.filter(
                user=user,
                conversation_id__in=parsed_target_ids,
                conversation__is_active=True,
            ).values_list("conversation_id", flat=True)
        )

        channel_layer = get_channel_layer()
        created_payloads = []

        for target_conversation_id in parsed_target_ids:
            if target_conversation_id not in allowed_target_conversations:
                continue

            for src in src_list:
                with transaction.atomic():
                    msg = PrivateMessage.objects.create(
                        conversation_id=target_conversation_id,
                        sender=user,
                        text=src.text or "",
                        message_type=src.message_type,
                        reply_to=src.reply_to if src.reply_to_id else None,
                    )

                    for a in src.attachments.all():
                        PrivateMessageAttachment.objects.create(
                            message=msg,
                            attachment_type=a.attachment_type,
                            url=a.url,
                            s3_key=getattr(a, "s3_key", "") or "",
                            thumbnail_url=getattr(a, "thumbnail_url", "") or "",
                            mime_type=getattr(a, "mime_type", "") or "",
                            file_name=getattr(a, "file_name", "") or "",
                            file_size=getattr(a, "file_size", None),
                            width=getattr(a, "width", None),
                            height=getattr(a, "height", None),
                            duration_ms=getattr(a, "duration_ms", None),
                        )

                    payload = {
                        "id": str(msg.id),
                        "clientTempId": None,
                        "conversationId": str(target_conversation_id),
                        "messageType": "TEXT",
                        "text": msg.text,
                        "sender": {"id": str(user.id), "name": user.full_name or user.username},
                        "createdAt": msg.created_at.isoformat(),
                        "isMine": True,
                        "deletedAt": None,
                        "editedAt": None,
                        "attachments": [],
                        "reactions": [],
                        "myReaction": None,
                        "replyTo": None,
                    }
                    created_payloads.append(payload)

                    async_to_sync(channel_layer.group_send)(
                        f"private_chat_{target_conversation_id}",
                        {
                            "type": "broadcast",
                            "payload": {
                                "type": "message:new",
                                "payload": payload,
                            },
                            "sender": None,
                        },
                    )

        if not created_payloads:
            return Response(
                {"error": "No messages were forwarded"},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {
                "success": True,
                "forwarded": len(created_payloads),
                "messages": created_payloads,
            },
            status=status.HTTP_200_OK,
        )


from django.db import transaction
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from community.models import (
    PrivateConversation,
    PrivateConversationMember,
    PrivateMessage,
)

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

class PrivateConversationMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        user = request.user

        # ✅ must be a member
        member = PrivateConversationMember.objects.filter(
            conversation_id=conversation_id,
            user=user
        ).first()

        if not member:
            return Response({"error": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        # ✅ load last messages
        msgs = (
            PrivateMessage.objects
            .filter(conversation_id=conversation_id, deleted_at__isnull=True)
            .select_related("sender")
            .order_by("-created_at")[:50]
        )

        # reverse oldest -> newest
        msgs = list(msgs)[::-1]

        results = []
        for m in msgs:
            results.append({
                "id": str(m.id),
                "clientTempId": getattr(m, "client_temp_id", None),
                "conversationId": str(conversation_id),
                "messageType": "TEXT",  # update if you support MEDIA
                "text": m.text or "",
                "sender": {"id": str(m.sender_id), "name": m.sender.full_name or m.sender.username},
                "createdAt": m.created_at.isoformat(),
                "isMine": str(m.sender_id) == str(user.id),
                "deletedAt": m.deleted_at.isoformat() if m.deleted_at else None,
                "editedAt": m.edited_at.isoformat() if getattr(m, "edited_at", None) else None,
                "attachments": [],  # update if you store attachments
                "reactions": [],
                "myReaction": None,
                "replyTo": None,
            })

        # ✅ update last_read_at
        member.last_read_at = timezone.now()
        member.save(update_fields=["last_read_at"])

        return Response(
            {"messages": results, "nextCursor": None},
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def post(self, request, conversation_id):
        user = request.user

        member = PrivateConversationMember.objects.filter(
            conversation_id=conversation_id,
            user=user
        ).first()

        if not member:
            return Response({"error": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        convo = PrivateConversation.objects.filter(id=conversation_id, is_active=True).first()
        if not convo:
            return Response({"error": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND)

        text = (request.data.get("text") or "").strip()
        client_temp_id = request.data.get("clientTempId")

        if not text:
            return Response({"error": "Text required"}, status=status.HTTP_400_BAD_REQUEST)

        msg = PrivateMessage.objects.create(
            conversation=convo,
            sender=user,
            text=text,
        )

        payload = {
            "id": str(msg.id),
            "clientTempId": client_temp_id,
            "conversationId": str(conversation_id),
            "messageType": "TEXT",
            "text": msg.text,
            "sender": {"id": str(user.id), "name": user.full_name or user.username},
            "createdAt": msg.created_at.isoformat(),
            "isMine": True,  # ✅ sender perspective
            "deletedAt": None,
            "editedAt": None,
            "attachments": [],
            "reactions": [],
            "myReaction": None,
            "replyTo": None,
        }

        # ✅ BROADCAST TO WS ROOM (instant update)
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"private_chat_{conversation_id}",
            {
                "type": "broadcast",
                "payload": {
                    "type": "message:new",
                    "payload": payload,
                },
                "sender": None,
            },
        )

        return Response(payload, status=status.HTTP_200_OK)


from community.models import PrivateMessageAttachment


class BulkPrivateMessageForwardView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        target_conversation_ids = request.data.get("targetIds") or []
        source_conversation_id = request.data.get("fromThreadId")
        raw_messages = request.data.get("messages") or []
        message_ids = [str(m.get("id")) for m in raw_messages if isinstance(m, dict) and m.get("id")]

        if not isinstance(target_conversation_ids, list) or not target_conversation_ids or not message_ids:
            return Response(
                {"error": "targetIds and messages are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        parsed_target_ids = []
        for raw in target_conversation_ids:
            try:
                parsed_target_ids.append(UUID(str(raw)))
            except Exception:
                continue

        parsed_message_ids = []
        for raw in message_ids:
            try:
                parsed_message_ids.append(UUID(str(raw)))
            except Exception:
                continue

        if not parsed_target_ids or not parsed_message_ids:
            return Response(
                {"error": "No valid target or message IDs"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        src_messages = (
            PrivateMessage.objects.select_related("sender", "conversation", "reply_to")
            .prefetch_related("attachments")
            .filter(id__in=parsed_message_ids, deleted_at__isnull=True)
        )

        if source_conversation_id:
            src_messages = src_messages.filter(conversation_id=source_conversation_id)

        src_list = list(src_messages)
        if not src_list:
            return Response({"error": "No forwardable messages found"}, status=status.HTTP_404_NOT_FOUND)

        allowed_source_conversations = set(
            PrivateConversationMember.objects.filter(
                user=user,
                conversation_id__in={m.conversation_id for m in src_list},
            ).values_list("conversation_id", flat=True)
        )

        src_list = [m for m in src_list if m.conversation_id in allowed_source_conversations]
        if not src_list:
            return Response({"error": "Not allowed to forward selected messages"}, status=status.HTTP_403_FORBIDDEN)

        allowed_target_conversations = set(
            PrivateConversationMember.objects.filter(
                user=user,
                conversation_id__in=parsed_target_ids,
                conversation__is_active=True,
            ).values_list("conversation_id", flat=True)
        )

        channel_layer = get_channel_layer()
        created_payloads = []

        for target_conversation_id in parsed_target_ids:
            if target_conversation_id not in allowed_target_conversations:
                continue

            for src in src_list:
                with transaction.atomic():
                    msg = PrivateMessage.objects.create(
                        conversation_id=target_conversation_id,
                        sender=user,
                        text=src.text or "",
                        message_type=src.message_type,
                        reply_to=src.reply_to if src.reply_to_id else None,
                    )

                    for a in src.attachments.all():
                        PrivateMessageAttachment.objects.create(
                            message=msg,
                            attachment_type=a.attachment_type,
                            url=a.url,
                            s3_key=getattr(a, "s3_key", "") or "",
                            thumbnail_url=getattr(a, "thumbnail_url", "") or "",
                            mime_type=getattr(a, "mime_type", "") or "",
                            file_name=getattr(a, "file_name", "") or "",
                            file_size=getattr(a, "file_size", None),
                            width=getattr(a, "width", None),
                            height=getattr(a, "height", None),
                            duration_ms=getattr(a, "duration_ms", None),
                        )

                    payload = {
                        "id": str(msg.id),
                        "clientTempId": None,
                        "conversationId": str(target_conversation_id),
                        "messageType": "TEXT",
                        "text": msg.text,
                        "sender": {"id": str(user.id), "name": user.full_name or user.username},
                        "createdAt": msg.created_at.isoformat(),
                        "isMine": True,
                        "deletedAt": None,
                        "editedAt": None,
                        "attachments": [],
                        "reactions": [],
                        "myReaction": None,
                        "replyTo": None,
                    }
                    created_payloads.append(payload)

                    async_to_sync(channel_layer.group_send)(
                        f"private_chat_{target_conversation_id}",
                        {
                            "type": "broadcast",
                            "payload": {
                                "type": "message:new",
                                "payload": payload,
                            },
                            "sender": None,
                        },
                    )

        if not created_payloads:
            return Response(
                {"error": "No messages were forwarded"},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {
                "success": True,
                "forwarded": len(created_payloads),
                "messages": created_payloads,
            },
            status=status.HTTP_200_OK,
        )


class CommunityForwardTargetsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        memberships = list(
            CommunityMembership.objects.select_related("hub")
            .filter(user=user, is_active=True, hub__is_active=True)
            .order_by("-joined_at")[:300]
        )

        membership_hub_ids = [m.hub_id for m in memberships]

        last_msg_subq = (
            HubMessage.objects.filter(
                hub_id=OuterRef("hub_id"),
                deleted_at__isnull=True,
                sender=user,
            )
            .order_by("-created_at")
            .values("created_at")[:1]
        )
        recent_rows = (
            CommunityMembership.objects.filter(user=user, is_active=True, hub_id__in=membership_hub_ids)
            .annotate(last_message_at=Subquery(last_msg_subq))
            .filter(last_message_at__isnull=False)
            .order_by(F("last_message_at").desc(nulls_last=True))
            .values_list("hub_id", flat=True)[:50]
        )

        recent_hub_ids = list(recent_rows)

        hubs_by_id = {m.hub_id: m.hub for m in memberships}
        targets = []
        seen = set()

        # 1) Recent chats first (active hubs the user is already in)
        for hub_id in recent_hub_ids:
            hub = hubs_by_id.get(hub_id)
            if not hub:
                continue
            seen.add(hub_id)
            targets.append(
                {
                    "id": str(hub.id),
                    "name": hub.name,
                    "type": "COMMUNITY",
                    "photo": getattr(hub, "photo", None),
                    "bucket": "RECENT",
                }
            )

        # 2) Remaining groups user is a member of
        for m in memberships:
            hub = m.hub
            if hub.id in seen:
                continue
            seen.add(hub.id)
            targets.append(
                {
                    "id": str(hub.id),
                    "name": hub.name,
                    "type": "COMMUNITY",
                    "photo": getattr(hub, "photo", None),
                    "bucket": "GROUPS",
                }
            )

        # 3) LGA groups in the user's current state (append at bottom)
        user_state = getattr(user, "admin_1", None)
        if user_state:
            lga_hubs = (
                CommunityHub.objects.filter(
                    admin_unit__level=2,
                    admin_unit__parent=user_state,
                    hub_type=HubType.SYSTEM,
                    is_active=True,
                )
                .select_related("admin_unit")
                .order_by("name")[:80]
            )

            for hub in lga_hubs:
                if hub.id in seen:
                    continue
                seen.add(hub.id)
                targets.append(
                    {
                        "id": str(hub.id),
                        "name": hub.name,
                        "type": "COMMUNITY",
                        "photo": getattr(hub, "photo", None),
                        "bucket": "LGA",
                    }
                )

        return Response({"targets": targets}, status=status.HTTP_200_OK)


class PrivateForwardTargetsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        blocked_ids = set(
            UserBlock.objects.filter(blocker=user).values_list("blocked_id", flat=True)
        )
        blocked_by_ids = set(
            UserBlock.objects.filter(blocked=user).values_list("blocker_id", flat=True)
        )

        memberships = list(
            PrivateConversationMember.objects.select_related(
                "conversation", "conversation__user1", "conversation__user2"
            )
            .filter(user=user, conversation__is_active=True)
            .order_by("-created_at")[:300]
        )

        # recent private chats by latest message time
        convo_ids = [m.conversation_id for m in memberships]
        last_msg_subq = (
            PrivateMessage.objects.filter(
                conversation_id=OuterRef("conversation_id"),
                deleted_at__isnull=True,
            )
            .order_by("-created_at")
            .values("created_at")[:1]
        )
        recent_conversation_ids = list(
            PrivateConversationMember.objects.filter(user=user, conversation_id__in=convo_ids)
            .annotate(last_message_at=Subquery(last_msg_subq))
            .filter(last_message_at__isnull=False)
            .order_by(F("last_message_at").desc(nulls_last=True))
            .values_list("conversation_id", flat=True)[:50]
        )

        memberships_by_convo = {m.conversation_id: m for m in memberships}

        targets = []
        seen = set()

        def build_target(membership, bucket: str):
            convo = membership.conversation
            other = convo.user2 if convo.user1_id == user.id else convo.user1

            if other.id in blocked_ids or other.id in blocked_by_ids:
                return None

            return {
                "id": str(convo.id),
                "conversation_id": str(convo.id),
                "name": other.full_name or other.username,
                "type": "PRIVATE",
                "photo": getattr(other, "photo", None),
                "bucket": bucket,
                "other_user": {
                    "id": str(other.id),
                    "name": other.full_name or other.username,
                    "photo": getattr(other, "photo", None),
                },
            }

        # 1) recent chats first
        for convo_id in recent_conversation_ids:
            membership = memberships_by_convo.get(convo_id)
            if not membership:
                continue
            payload = build_target(membership, "RECENT")
            if not payload:
                continue
            seen.add(convo_id)
            targets.append(payload)

        # 2) associated contacts list (remaining conversation peers)
        for membership in memberships:
            convo_id = membership.conversation_id
            if convo_id in seen:
                continue
            payload = build_target(membership, "CONTACTS")
            if not payload:
                continue
            seen.add(convo_id)
            targets.append(payload)

        # 3) contacts explicitly attached by user (server-side list)
        from accounts.models import EmergencyContact

        contact_phones = list(
            EmergencyContact.objects.filter(user=user).values_list("phone", flat=True)
        )
        if contact_phones:
            possible_users = (
                User.objects.filter(phone_number__in=contact_phones, is_active=True, is_suspended=False)
                .exclude(id=user.id)
                .only("id", "full_name", "username", "photo")[:120]
            )

            for other in possible_users:
                if other.id in blocked_ids or other.id in blocked_by_ids:
                    continue

                convo = (
                    PrivateConversation.objects.filter(is_active=True)
                    .filter(
                        Q(user1=user, user2=other) |
                        Q(user1=other, user2=user)
                    )
                    .first()
                )

                if not convo:
                    convo = PrivateConversation.objects.create(
                        user1=user,
                        user2=other,
                        is_active=True,
                    )

                PrivateConversationMember.objects.get_or_create(conversation=convo, user=user)
                PrivateConversationMember.objects.get_or_create(conversation=convo, user=other)

                if convo.id in seen:
                    continue

                seen.add(convo.id)
                targets.append(
                    {
                        "id": str(convo.id),
                        "conversation_id": str(convo.id),
                        "name": other.full_name or other.username,
                        "type": "PRIVATE",
                        "photo": getattr(other, "photo", None),
                        "bucket": "CONTACTS",
                        "other_user": {
                            "id": str(other.id),
                            "name": other.full_name or other.username,
                            "photo": getattr(other, "photo", None),
                        },
                    }
                )

        return Response({"targets": targets}, status=status.HTTP_200_OK)


class CommunityInboxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        memberships = (
            CommunityMembership.objects.select_related("hub")
            .filter(user=user, is_active=True, hub__is_active=True)
            .order_by("-joined_at")[:250]
        )

        conversations = [
            {
                "id": str(m.hub.id),
                "hub_id": str(m.hub.id),
                "name": m.hub.name,
                "type": "COMMUNITY",
                "photo": getattr(m.hub, "photo", None),
            }
            for m in memberships
        ]

        return Response({"conversations": conversations}, status=status.HTTP_200_OK)

import boto3
from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.gis.geos import Point
import uuid
import os

from community.models import CommunityHub
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.api_permissions import HasRBACPermission
from accounts.permissions import Permissions
from audit.utils import log_action

from community.access import user_is_hub_member
from notifications.dispatch import notify_hub_members
from notifications.models import NotificationType
from dashboards.realtime import broadcast_to_role
from live.services import create_sos_stream
from live.services import issue_livekit_token


from .models import (
    SosDraft,
    SosMedia,
    SOSAlert,
    SOSStatus,
)
from .queries import get_nearby_sos

class SosDraftCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        draft = SosDraft.objects.create(
            user=request.user,
            message=request.data.get("message", ""),
            signal_quality=request.data.get("signal", "LOW"),
            status="DRAFT",
        )

        return Response({
            "draftId": str(draft.id),
        })


class SosMediaPresignView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, draft_id):
        draft = get_object_or_404(
            SosDraft,
            id=draft_id,
            user=request.user,
            status="DRAFT",
        )

        media_type = request.data["mediaType"]
        if media_type not in ("audio", "video", "image"):
            return Response({"error": "Invalid media type"}, status=400)

        content_type = request.data["contentType"]
        filename = request.data["filename"]

        if hasattr(draft, "sos"):
            return Response(
                {"error": "SOS already activated"},
                status=409
            )



        s3 = boto3.client("s3")


        safe_name = os.path.basename(filename).replace(" ", "_")
        key = f"sos/pre/{draft.id}/{uuid.uuid4()}-{safe_name}"



        presigned = s3.generate_presigned_post(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=key,
            Fields={"Content-Type": content_type},
            Conditions=[
                {"Content-Type": content_type},
                ["content-length-range", 1, 200 * 1024 * 1024],
            ],
            ExpiresIn=300,
        )

        media = SosMedia.objects.create(
            draft=draft,
            media_type=media_type,
            file=key,
        )

        return Response({
            "mediaId": str(media.id),
            "upload": presigned,
        })

class SosMediaFinalizeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, media_id):
        media = get_object_or_404(
            SosMedia,
            id=media_id,
            draft__user=request.user,
            draft__status="DRAFT",
        )

        media.duration_seconds = request.data.get("duration")
        s3 = boto3.client("s3")

        try:
            s3.head_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=media.file.name
            )
        except s3.exceptions.NoSuchKey:
            return Response({"error": "Upload missing"}, status=400)

        return Response({"ok": True})

class ActivateSosView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.TRIGGER_SOS

    @transaction.atomic
    def post(self, request, draft_id):
        draft = get_object_or_404(
            SosDraft,
            id=draft_id,
            user=request.user,
            status="DRAFT",
        )

        if not draft.message and not draft.media.exists():
            return Response(
                {"error": "Draft has no content"},
                status=400
            )
        
        if hasattr(draft, "sos"):
            return Response(
                {"error": "SOS already activated"},
                status=409
            )


        hub_id = request.data.get("hub_id")
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")

        try:
            latitude = float(latitude)
            longitude = float(longitude)
        except (TypeError, ValueError):
            return Response({"error": "Invalid coordinates"}, status=400)

        if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
            return Response({"error": "Coordinates out of range"}, status=400)


        if not hub_id or latitude is None or longitude is None:
            return Response({"error": "Missing location or hub"}, status=400)

        hub = get_object_or_404(CommunityHub, id=hub_id)

        if hub and not user_is_hub_member(request.user, hub):
            return Response({"error": "Not a hub member"}, status=403)

        sos = SOSAlert.objects.create(
            user=request.user,
            hub_id=hub_id,
            latitude=latitude,
            longitude=longitude,
            status=SOSStatus.ACTIVE,
        )




        stream = create_sos_stream(
            user=request.user,
            lat=latitude,
            lng=longitude,
        )

        sos.stream = stream
        sos.live_started_at = timezone.now()
        sos.save(update_fields=["stream"])
        

        token = issue_livekit_token(
            user_id=request.user.id,
            room=stream.room,
            publish=True,
        )


        draft.status = "CONFIRMED"
        draft.save(update_fields=["status"])

        log_action(
            user=request.user,
            action="ACTIVATE",
            object_type="SOS",
            object_id=sos.id,
            metadata={"draft": str(draft.id)},
            request=request,
        )

        notify_hub_members(
            hub=sos.hub,
            title="🚨 SOS Alert",
            message="An SOS has been triggered in your community.",
            notification_type=NotificationType.SOS,
            exclude_user=request.user,
            request=request,
        )

        # WebSocket broadcast
        broadcast_to_role(
            role="LAW_ENFORCEMENT",
            data={
                "type": "SOS",
                "action": "NEW",
                "sos_id": str(sos.id),
                "location": {
                    "lat": sos.latitude,
                    "lng": sos.longitude,
                },
            },
        )

        broadcast_to_role(
            role="HQ_ADMIN",
            data={
                "type": "SOS",
                "action": "NEW",
                "sos_id": str(sos.id),
            },
        )

        return Response({
            "sosId": sos.id,
            "stream": {
                "id": stream.id,
                "room": stream.room,
                "token": token,
                "wsUrl": settings.LIVEKIT_WS_URL,
            },
        })

class ResolveSosView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.RECEIVE_SOS

    def post(self, request, sos_id):
        sos = get_object_or_404(SOSAlert, id=sos_id)

        sos.status = request.data.get("status", SOSStatus.RESOLVED)
        sos.resolved_at = timezone.now()
        sos.save(update_fields=["status", "resolved_at"])

        log_action(
            user=request.user,
            action="RESOLVE",
            object_type="SOS",
            object_id=sos.id,
        )

        return Response({"ok": True})

class ActiveSosView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.RECEIVE_SOS

    def get(self, request):
        qs = SOSAlert.objects.filter(status=SOSStatus.ACTIVE)

        return Response([
            {
                "id": sos.id,
                "hub": str(sos.hub),
                "lat": sos.latitude,
                "lng": sos.longitude,
                "time": sos.created_at,
            }
            for sos in qs
        ])

class NearbySosView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.RECEIVE_SOS

    def get(self, request):
        lat = float(request.query_params["lat"])
        lng = float(request.query_params["lng"])

        point = Point(lng, lat)
        sos_alerts = get_nearby_sos(point)

        return Response([
            {
                "id": sos.id,
                "distance_m": sos.distance.m,
                "status": sos.status,
            }
            for sos in sos_alerts
        ])


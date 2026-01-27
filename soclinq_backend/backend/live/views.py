from django.db import transaction
from django.utils.timezone import now
from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import (
    LiveStream,
    StreamRecording,
    StreamSeverityLog,
    StreamResponder,
    StreamActivity,
)
from .serializers import LiveStreamSerializer
from .permissions import IsResponder
from .services import issue_livekit_token
from audit.models import AuditLog
from django.conf import settings

class StartSOSStreamView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        room = f"sos-{request.user.id}-{int(now().timestamp())}"

        stream = LiveStream.objects.create(
            owner=request.user,
            room=room,
            title="SOS Emergency",
            latitude=request.data["lat"],
            longitude=request.data["lng"],
            status="LIVE",
        )

        # Activity
        StreamActivity.objects.create(
            stream=stream,
            actor=request.user,
            type="STARTED",
        )

        # Audit
        AuditLog.objects.create(
            user=request.user,
            actor_role="USER",
            action="STREAM_START",
            stream_id=stream.id,
            object_type="LiveStream",
            object_id=str(stream.id),
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT"),
        )

        token = issue_livekit_token(
            user_id=request.user.id,
            room=room,
            publish=True,
        )

        return Response({
            "room": room,
            "token": token,
            "wsUrl": settings.LIVEKIT_WS_URL,
            "streamUrl": f"https://{settings.LIVEKIT_DOMAIN}/hls/{room}/index.m3u8",
        })

class EndSOSStreamView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, room):
        stream = get_object_or_404(
            LiveStream,
            room=room,
            owner=request.user,
            status="LIVE",
        )

        stream.status = "ENDED"
        stream.ended_at = now()
        stream.save()

        StreamActivity.objects.create(
            stream=stream,
            actor=request.user,
            type="ENDED",
        )

        AuditLog.objects.create(
            user=request.user,
            actor_role="USER",
            action="STREAM_END",
            stream_id=stream.id,
        )

        return Response({"ended": True})

class UpdateSeverityView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, room):
        stream = get_object_or_404(LiveStream, room=room, status="LIVE")

        score = request.data["score"]
        level = request.data["level"]

        # Cache current
        stream.current_severity_score = score
        stream.current_severity_level = level
        stream.save(update_fields=[
            "current_severity_score",
            "current_severity_level",
        ])

        # Full log
        StreamSeverityLog.objects.create(
            stream=stream,
            score=score,
            level=level,
        )

        StreamActivity.objects.create(
            stream=stream,
            type="SEVERITY_UPDATE",
            metadata={"score": score, "level": level},
        )

        AuditLog.objects.create(
            actor_role="SYSTEM",
            action="SEVERITY_UPDATE",
            stream_id=stream.id,
            metadata={"score": score, "level": level},
        )

        return Response({"ok": True})

class JoinStreamAsResponderView(APIView):
    permission_classes = [IsAuthenticated, IsResponder]

    @transaction.atomic
    def post(self, request, room):
        stream = get_object_or_404(LiveStream, room=room, status="LIVE")

        responder, created = StreamResponder.objects.get_or_create(
            stream=stream,
            responder=request.user,
        )

        StreamActivity.objects.create(
            stream=stream,
            actor=request.user,
            type="RESPONDER_JOINED",
        )

        AuditLog.objects.create(
            user=request.user,
            actor_role="RESPONDER",
            action="RESPONDER_JOIN",
            stream_id=stream.id,
        )

        token = issue_livekit_token(
            user_id=request.user.id,
            room=room,
            publish=False,
        )

        return Response({
            "token": token,
            "wsUrl": settings.LIVEKIT_WS_URL,
        })

class AcknowledgeStreamView(APIView):
    permission_classes = [IsAuthenticated, IsResponder]

    def post(self, request, room):
        responder = get_object_or_404(
            StreamResponder,
            stream__room=room,
            responder=request.user,
        )

        responder.acknowledged = True
        responder.save(update_fields=["acknowledged"])

        StreamActivity.objects.create(
            stream=responder.stream,
            actor=request.user,
            type="RESPONDER_ACK",
        )

        AuditLog.objects.create(
            user=request.user,
            actor_role="RESPONDER",
            action="RESPONDER_ACK",
            stream_id=responder.stream.id,
        )

        return Response({"acknowledged": True})

class LiveStreamsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        lat = float(request.query_params["lat"])
        lng = float(request.query_params["lng"])

        live_streams = LiveStream.objects.filter(status="LIVE")
        previous = LiveStream.objects.filter(status="ENDED").order_by("-ended_at")[:7]

        # Distance calculation assumed handled in serializer/service
        return Response({
            "nearest": LiveStreamSerializer(live_streams.first()).data if live_streams else None,
            "others": LiveStreamSerializer(live_streams[1:], many=True).data,
            "previous7Days": LiveStreamSerializer(previous, many=True).data,
        })

class LiveKitWebhookView(APIView):
    authentication_classes = []  # webhook secret instead
    permission_classes = []

    @transaction.atomic
    def post(self, request):
        event = request.data.get("event")

        if event == "recording_finished":
            room = request.data["room"]
            recording = request.data["recording"]

            stream = LiveStream.objects.filter(room=room).first()
            if not stream:
                return Response({"ignored": True})

            StreamRecording.objects.create(
                stream=stream,
                provider="livekit",
                recording_url=recording["url"],
                started_at=recording["startedAt"],
                ended_at=recording["endedAt"],
                duration_seconds=recording["duration"],
            )

            StreamActivity.objects.create(
                stream=stream,
                type="RECORDING_READY",
            )

            AuditLog.objects.create(
                actor_role="SYSTEM",
                action="STREAM_RECORDING_READY",
                stream_id=stream.id,
                metadata={"url": recording["url"]},
            )

        return Response({"ok": True})

class ResponderPriorityFeedView(APIView):
    permission_classes = [IsAuthenticated, IsResponder]

    def get(self, request):
        lat = float(request.query_params["lat"])
        lng = float(request.query_params["lng"])

        feed = get_responder_feed(lat, lng)

        return Response([
            {
                **LiveStreamSerializer(item["stream"]).data,
                "priority": item["priority"],
                "distanceKm": item["distanceKm"],
            }
            for item in feed
        ])

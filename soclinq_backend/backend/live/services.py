from math import radians, cos, sin, asin, sqrt
from django.utils import timezone
from datetime import timedelta
from .models import LiveStream
from livekit.api import AccessToken, VideoGrants
from django.conf import settings
from django.utils.timezone import now
from .models import LiveStream, StreamActivity
from audit.models import AuditLog


def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # km
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)

    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    return R * c

def get_streams_for_location(lat, lng):
    live_streams = LiveStream.objects.filter(is_live=True)

    enriched = []
    for s in live_streams:
        distance = haversine(lat, lng, s.latitude, s.longitude)
        s.distanceKm = round(distance, 2)
        enriched.append(s)

    enriched.sort(key=lambda x: x.distanceKm)

    nearest = enriched[0] if enriched else None
    others = enriched[1:] if len(enriched) > 1 else []

    previous = LiveStream.objects.filter(
        is_live=False,
        ended_at__gte=timezone.now() - timedelta(days=7)
    ).order_by("-ended_at")[:10]

    return nearest, others, previous

def issue_livekit_token(*, user_id: int, room: str, publish: bool) -> str:
    """
    Issues a LiveKit access token.

    :param user_id: Django user ID
    :param room: LiveKit room name
    :param publish: Whether user can publish media
    """

    ttl = 60 * 60  # 1 hour

    token = (
        AccessToken(
            api_key=settings.LIVEKIT_API_KEY,
            api_secret=settings.LIVEKIT_API_SECRET,
            identity=str(user_id),
            ttl=ttl,
        )
        .with_grants(
            VideoGrants(
                room_join=True,
                room=room,
                can_publish=publish,
                can_subscribe=True,
            )
        )
    )

    return token.to_jwt()

def create_sos_stream(user, lat, lng):
    room = f"sos-{user.id}-{int(now().timestamp())}"

    stream = LiveStream.objects.create(
        owner=user,
        room=room,
        title="SOS Emergency",
        latitude=lat,
        longitude=lng,
        status="LIVE",
    )

    StreamActivity.objects.create(
        stream=stream,
        actor=user,
        type="STARTED",
    )

    AuditLog.objects.create(
        user=user,
        actor_role="USER",
        action="STREAM_START",
        stream_id=stream.id,
        object_type="LiveStream",
        object_id=str(stream.id),
    )

    return stream

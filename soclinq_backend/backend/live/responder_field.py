from django.utils.timezone import now
from datetime import timedelta
from .distance import haversine_km

def compute_priority(stream, responder_lat, responder_lng):
    # Distance
    distance_km = haversine_km(
        responder_lat,
        responder_lng,
        stream.latitude,
        stream.longitude,
    )

    # Normalize distance (closer = higher)
    distance_weight = max(0, 100 - (distance_km * 10))

    # Severity already computed by AI
    severity_weight = stream.current_severity_score

    # Recency (last 10 minutes matter most)
    age_seconds = (now() - stream.started_at).total_seconds()
    recency_weight = max(0, 100 - (age_seconds / 60))

    priority_score = (
        (severity_weight * 0.6)
        + (distance_weight * 0.3)
        + (recency_weight * 0.1)
    )

    return {
        "priority": round(priority_score, 2),
        "distance_km": round(distance_km, 2),
    }

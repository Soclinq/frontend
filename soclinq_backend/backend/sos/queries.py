from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from .models import SOSAlert


def get_nearby_sos(point, radius_km=2):
    return (
        SOSAlert.objects
        .filter(status="ACTIVE", location__distance_lte=(point, D(km=radius_km)))
        .annotate(distance=Distance("location", point))
        .order_by("distance")
    )

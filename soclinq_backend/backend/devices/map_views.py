from rest_framework.views import APIView
from rest_framework.response import Response
from dashboards.geo_serializers import point_to_geojson
from accounts.api_permissions import HasRBACPermission
from accounts.permissions import Permissions
from .models import DeviceLocation


class DeviceTrackMapView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.TRACK_DEVICE

    def get(self, request, device_id):
        locations = DeviceLocation.objects.filter(
            device_id=device_id
        )[:100]

        features = [
            {
                "type": "Feature",
                "geometry": point_to_geojson(loc.location),
                "properties": {
                    "time": loc.created_at,
                    "speed": loc.speed,
                    "source": loc.source,
                }
            }
            for loc in locations
        ]

        return Response({
            "type": "FeatureCollection",
            "features": features,
        })

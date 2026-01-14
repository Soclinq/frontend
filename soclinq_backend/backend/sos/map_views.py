from rest_framework.views import APIView
from rest_framework.response import Response
from .models import SOSAlert
from .models import SOSStatus
from dashboards.geo_serializers import point_to_geojson
from accounts.api_permissions import HasRBACPermission
from accounts.permissions import Permissions


class SOSMapView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.RECEIVE_SOS

    def get(self, request):
        sos_alerts = SOSAlert.objects.filter(status=SOSStatus.ACTIVE)

        features = []
        for sos in sos_alerts:
            features.append({
                "type": "Feature",
                "geometry": point_to_geojson(sos.location),
                "properties": {
                    "id": str(sos.id),
                    "status": sos.status,
                    "hub": str(sos.hub.id),
                    "time": sos.created_at,
                }
            })

        return Response({
            "type": "FeatureCollection",
            "features": features,
        })

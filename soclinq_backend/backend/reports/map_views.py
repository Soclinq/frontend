from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Report
from dashboards.geo_serializers import point_to_geojson
from accounts.api_permissions import HasRBACPermission
from accounts.permissions import Permissions


class ReportsMapView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.VIEW_REPORT

    def get(self, request):
        reports = Report.objects.all()[:500]

        features = []
        for r in reports:
            features.append({
                "type": "Feature",
                "geometry": point_to_geojson(r.location),
                "properties": {
                    "id": str(r.id),
                    "category": r.category,
                    "urgency": r.urgency,
                    "status": r.status,
                }
            })

        return Response({
            "type": "FeatureCollection",
            "features": features,
        })

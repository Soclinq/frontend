from rest_framework.views import APIView
from rest_framework.response import Response
from reports.models import Report
from accounts.api_permissions import HasRBACPermission
from accounts.permissions import Permissions


class HeatmapDataView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.VIEW_REPORT

    def get(self, request):
        points = [
            [r.location.y, r.location.x]
            for r in Report.objects.all()
        ]

        return Response(points)

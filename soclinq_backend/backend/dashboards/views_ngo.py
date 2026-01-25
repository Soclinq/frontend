from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.api_permissions import HasRBACPermission
from accounts.permissions import Permissions
from reports.models import Report
from django.db.models import Count


class NGODashboardView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.VIEW_REPORT

    def get(self, request):
        data = (
            Report.objects
            .values("category")
            .annotate(total=Count("id"))
        )
        return Response({
            "report_statistics": data
        })

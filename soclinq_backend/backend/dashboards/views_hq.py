from rest_framework.views import APIView
from rest_framework.response import Response
from audit.utils import log_action
from accounts.api_permissions import HasRBACPermission
from accounts.permissions import Permissions
from .metrics import system_overview
from reports.models import Report
from sos.models import SOSAlert


class HQDashboardView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.VIEW_AUDIT_LOGS

    def get(self, request):
        data = {
            "overview": system_overview(),
            "recent_reports": Report.objects.all()[:10].values(),
            "active_sos": SOSAlert.objects.filter(status="ACTIVE").values(),
        }
        log_action(
            user=request.user,
            action="VIEW",
            object_type="Dashboard",
            metadata={"dashboard": "HQ"}
        )
        return Response(data)

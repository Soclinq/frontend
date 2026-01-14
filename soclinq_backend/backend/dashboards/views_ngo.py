from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.api_permissions import HasRBACPermission
from accounts.permissions import Permissions
from reports.models import Report
from sos.models import SOSAlert
from community.models import CommunityMembership


class LawEnforcementDashboardView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.VIEW_REPORT

    def get(self, request):
        hubs = CommunityMembership.objects.filter(
            user=request.user
        ).values_list("hub", flat=True)

        data = {
            "reports": Report.objects.filter(hub__in=hubs).values(),
            "active_sos": SOSAlert.objects.filter(
                hub__in=hubs, status="ACTIVE"
            ).values(),
        }
        return Response(data)

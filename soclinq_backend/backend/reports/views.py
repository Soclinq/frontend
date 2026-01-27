from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.api_permissions import HasRBACPermission
from accounts.permissions import Permissions
from community.access import user_is_hub_member
from audit.utils import log_action
from .models import Report, ReportCategory
from dashboards.realtime import broadcast_to_role
from community.models import CommunityMembership, HubRole, CommunityHub
from .models import ReportStatus


class SubmitReportView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.SUBMIT_REPORT

    def post(self, request):
        hub_id = request.data.get("hub_id")

        hub = CommunityHub.objects.get(id=hub_id)

        if not user_is_hub_member(request.user, hub):
            return Response({"error": "Not a hub member"}, status=403)

        report = Report.objects.create(
            reporter=request.user,
            hub=hub,
            category=request.data.get("category"),
            urgency=request.data.get("urgency"),
            description=request.data.get("description"),
            is_anonymous=request.data.get("is_anonymous", False),
            latitude=request.data.get("latitude"),
            longitude=request.data.get("longitude"),
        )

        broadcast_to_role(
            role="COMMUNITY_LEADER",
            data={
                "type": "REPORT",
                "action": "NEW",
                "report_id": str(report.id),
                "category": report.category,
            }
        )

        log_action(
            user=request.user,
            action="CREATE",
            request=request,
            object_type="Report",
            object_id=report.id,
            metadata={"category": report.category},
        )


        return Response({"message": "Report submitted", "id": report.id})


class ReviewReportView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.VIEW_REPORT

    def post(self, request, report_id):
        report = Report.objects.get(id=report_id)

        membership = CommunityMembership.objects.filter(
            user=request.user,
            hub=report.hub,
            role__in=[HubRole.LEADER, HubRole.MODERATOR],
        ).first()

        if not membership:
            return Response({"error": "Not authorized"}, status=403)

        report.status = request.data.get("status", ReportStatus.UNDER_REVIEW)
        report.save()

        log_action(
            user=request.user,
            action="UPDATE",
            object_type="Report",
            object_id=report.id,
            metadata={"new_status": report.status},
        )

        return Response({"message": "Report updated"})

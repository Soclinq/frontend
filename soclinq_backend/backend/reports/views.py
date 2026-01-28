from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from accounts.api_permissions import HasRBACPermission
from accounts.permissions import Permissions

from audit.utils import log_action
from dashboards.realtime import broadcast_to_role

from community.models import CommunityMembership, CommunityHub, MembershipRole
from .models import Report, ReportStatus, ReportCategory


class SubmitReportView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.SUBMIT_REPORT

    def post(self, request):
        user = request.user
        hub_id = request.data.get("hub_id")

        if not hub_id:
            return Response({"error": "hub_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Find hub safely
        try:
            hub = CommunityHub.objects.get(id=hub_id, is_active=True)
        except CommunityHub.DoesNotExist:
            return Response({"error": "Hub not found"}, status=status.HTTP_404_NOT_FOUND)

        # ✅ Membership check (must be active member)
        is_member = CommunityMembership.objects.filter(
            user=user,
            hub=hub,
            is_active=True,
        ).exists()

        if not is_member:
            return Response({"error": "Not a hub member"}, status=status.HTTP_403_FORBIDDEN)

        # ✅ Optional: validate category if it's a FK or choice
        category = request.data.get("category")
        urgency = request.data.get("urgency")
        description = request.data.get("description")

        if not description:
            return Response({"error": "description is required"}, status=status.HTTP_400_BAD_REQUEST)

        # If Report.category is FK to ReportCategory:
        # (only enable this if that's how your Report model works)
        #
        # try:
        #     category_obj = ReportCategory.objects.get(id=category)
        # except ReportCategory.DoesNotExist:
        #     return Response({"error": "Invalid category"}, status=status.HTTP_400_BAD_REQUEST)

        report = Report.objects.create(
            reporter=user,
            hub=hub,
            category=category,  # or category_obj if FK
            urgency=urgency,
            description=description,
            is_anonymous=request.data.get("is_anonymous", False),
            latitude=request.data.get("latitude"),
            longitude=request.data.get("longitude"),
        )

        # ✅ Notify Hub Leaders & Moderators
        broadcast_to_role(
            role=MembershipRole.LEADER,  # ✅ updated role
            data={
                "type": "REPORT",
                "action": "NEW",
                "hub_id": str(hub.id),
                "report_id": str(report.id),
                "category": report.category,
                "urgency": report.urgency,
            },
        )

        broadcast_to_role(
            role=MembershipRole.MODERATOR,  # ✅ updated role
            data={
                "type": "REPORT",
                "action": "NEW",
                "hub_id": str(hub.id),
                "report_id": str(report.id),
                "category": report.category,
                "urgency": report.urgency,
            },
        )

        log_action(
            user=user,
            action="CREATE",
            request=request,
            object_type="Report",
            object_id=report.id,
            metadata={
                "hub_id": str(hub.id),
                "category": report.category,
                "urgency": report.urgency,
                "anonymous": report.is_anonymous,
            },
        )

        return Response(
            {"message": "Report submitted", "id": str(report.id)},
            status=status.HTTP_201_CREATED,
        )


class ReviewReportView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.VIEW_REPORT

    def post(self, request, report_id):
        user = request.user

        # ✅ Find report safely
        try:
            report = Report.objects.select_related("hub").get(id=report_id)
        except Report.DoesNotExist:
            return Response({"error": "Report not found"}, status=status.HTTP_404_NOT_FOUND)

        # ✅ Must be leader/moderator in that hub
        membership = CommunityMembership.objects.filter(
            user=user,
            hub=report.hub,
            is_active=True,
            role__in=[MembershipRole.LEADER, MembershipRole.MODERATOR],
        ).first()

        if not membership:
            return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get("status", ReportStatus.UNDER_REVIEW)

        # ✅ Validate status value
        valid_statuses = [choice[0] for choice in ReportStatus.choices]
        if new_status not in valid_statuses:
            return Response(
                {"error": f"Invalid status. Allowed: {valid_statuses}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report.status = new_status
        report.save(update_fields=["status"])

        log_action(
            user=user,
            action="UPDATE",
            request=request,
            object_type="Report",
            object_id=report.id,
            metadata={
                "hub_id": str(report.hub.id),
                "new_status": report.status,
                "reviewed_by_role": membership.role,
            },
        )

        # ✅ Optional: broadcast status update to hub members/admin dashboard
        broadcast_to_role(
            role=MembershipRole.LEADER,
            data={
                "type": "REPORT",
                "action": "STATUS_UPDATED",
                "report_id": str(report.id),
                "hub_id": str(report.hub.id),
                "status": report.status,
            },
        )

        return Response(
            {"message": "Report updated", "status": report.status},
            status=status.HTTP_200_OK,
        )

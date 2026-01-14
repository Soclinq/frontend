from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.api_permissions import HasRBACPermission
from accounts.permissions import Permissions
from .models import CommunityMembership, HubRole
from audit.utils import log_action


class VerifyCommunityLeaderView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.SUSPEND_USER  # admin-level

    def post(self, request):
        membership_id = request.data.get("membership_id")

        membership = CommunityMembership.objects.get(id=membership_id)
        membership.role = HubRole.LEADER
        membership.save()

        log_action(
            user=request.user,
            action="UPDATE",
            object_type="CommunityMembership",
            object_id=membership.id,
            metadata={"new_role": "LEADER"},
        )

        return Response({"message": "Leader verified"})

from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.api_permissions import HasRBACPermission
from accounts.permissions import Permissions
from community.access import user_is_hub_member
from audit.utils import log_action
from .models import SOSAlert
from django.contrib.gis.geos import Point
from .queries import get_nearby_sos
from notifications.dispatch import notify_hub_members
from notifications.models import NotificationType
from dashboards.realtime import broadcast_to_role




class TriggerSOSView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.TRIGGER_SOS

    def post(self, request):
        hub_id = request.data.get("hub_id")
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")

        hub = CommunityHub.objects.get(id=hub_id)

        if not user_is_hub_member(request.user, hub):
            return Response({"error": "Not a hub member"}, status=403)

        sos = SOSAlert.objects.create(
            user=request.user,
            hub=hub,
            latitude=latitude,
            longitude=longitude,
        )

        log_action(
            user=request.user,
            action="CREATE",
            request=request,
            object_type="SOS",
            object_id=sos.id,
            metadata={"hub": str(hub.id)},
        )

        notify_hub_members(
                hub=hub,
                title="🚨 SOS Alert",
                message="An SOS has been triggered in your community.",
                notification_type=NotificationType.SOS,
                exclude_user=request.user,
                request=request,
            )
        
        broadcast_to_role(
            role="LAW_ENFORCEMENT",
            data={
                "type": "SOS",
                "action": "NEW",
                "sos_id": str(sos.id),
                "hub": str(hub.id),
                "location": {
                    "lat": sos.location.y,
                    "lng": sos.location.x,
                },
            }
        )

        broadcast_to_role(
            role="HQ_ADMIN",
            data={
                "type": "SOS",
                "action": "NEW",
                "sos_id": str(sos.id),
            }
        )


        return Response({"message": "SOS triggered", "id": sos.id})


from django.utils import timezone
from .models import SOSStatus


class ResolveSOSView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.RECEIVE_SOS

    def post(self, request, sos_id):
        sos = SOSAlert.objects.get(id=sos_id)

        sos.status = request.data.get("status", SOSStatus.RESOLVED)

        if sos.status == SOSStatus.RESOLVED:
            sos.resolved_at = timezone.now()

        sos.save()

        log_action(
            user=request.user,
            action="UPDATE",
            object_type="SOS",
            object_id=sos.id,
            metadata={"new_status": sos.status},
        )

        return Response({"message": "SOS updated"})


class ActiveSOSView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.RECEIVE_SOS

    def get(self, request):
        sos_alerts = SOSAlert.objects.filter(status=SOSStatus.ACTIVE)

        data = [
            {
                "id": sos.id,
                "hub": str(sos.hub),
                "lat": sos.latitude,
                "lng": sos.longitude,
                "time": sos.created_at,
            }
            for sos in sos_alerts
        ]

        return Response(data)


class NearbySOSView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.RECEIVE_SOS

    def get(self, request):
        lat = float(request.query_params.get("lat"))
        lng = float(request.query_params.get("lng"))

        point = Point(lng, lat)

        sos_alerts = get_nearby_sos(point)

        data = [
            {
                "id": sos.id,
                "distance_m": sos.distance.m,
                "status": sos.status,
            }
            for sos in sos_alerts
        ]

        return Response(data)

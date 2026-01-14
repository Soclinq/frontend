from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.api_permissions import HasRBACPermission
from accounts.permissions import Permissions
from audit.utils import log_action
from .models import Device


class RegisterDeviceView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.TRACK_DEVICE

    def post(self, request):
        device = Device.objects.create(
            owner=request.user,
            imei=request.data.get("imei"),
            phone_model=request.data.get("phone_model"),
            sim_number=request.data.get("sim_number", ""),
        )

        log_action(
            user=request.user,
            action="CREATE",
            object_type="Device",
            object_id=device.id,
        )

        return Response({"message": "Device registered", "id": device.id})


class MarkDeviceMissingView(APIView):
    permission_classes = [HasRBACPermission]
    required_permission = Permissions.TRACK_DEVICE

    def post(self, request, device_id):
        device = Device.objects.get(
            id=device_id,
            owner=request.user
        )

        device.status = "MISSING"
        device.save()

        log_action(
            user=request.user,
            action="UPDATE",
            object_type="Device",
            object_id=device.id,
            metadata={"status": "MISSING"},
        )

        return Response({"message": "Device marked as missing"})

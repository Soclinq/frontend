from rest_framework.permissions import BasePermission
from .utils import has_permission

class HasRBACPermission(BasePermission):
    required_permission = None

    def has_permission(self, request, view):
        if self.required_permission is None:
            return True

        return has_permission(request.user, self.required_permission)

from rest_framework.permissions import BasePermission


class IsResponder(BasePermission):
    """
    Allows access only to verified responders.
    """

    message = "Responder privileges required."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Option 1: Group-based (RECOMMENDED)
        if user.groups.filter(name="RESPONDER").exists():
            return True

        # Option 2: Boolean flag (uncomment if used)
        # if getattr(user, "is_responder", False):
        #     return True

        return False

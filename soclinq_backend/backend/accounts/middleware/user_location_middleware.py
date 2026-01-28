from django.utils.deprecation import MiddlewareMixin

from accounts.utils import get_ip_location, update_user_location


class UserLocationMiddleware(MiddlewareMixin):
    """
    IP-based location fallback middleware with throttling.
    """

    def process_request(self, request):
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            return

        # 🚫 Never override GPS
        if user.last_known_location and user.location_source == "GPS":
            return

        ip_address = self._get_client_ip(request)
        ip_location = get_ip_location(ip_address)

        if not ip_location:
            return

        try:
            update_user_location(
                user=user,
                lat=ip_location["lat"],
                lng=ip_location["lng"],
                source="IP",
            )
        except Exception:
            pass  # never block requests

    def _get_client_ip(self, request):
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            return xff.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")

from django.utils.deprecation import MiddlewareMixin
from .utils import log_action


class AuditMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        # Log only sensitive paths
        if request.path.startswith("/api/"):
            if response.status_code in [401, 403]:
                log_action(
                    user=request.user if request.user.is_authenticated else None,
                    action="ACCESS_DENIED",
                    request=request,
                    was_successful=False,
                    metadata={
                        "path": request.path,
                        "method": request.method,
                        "status_code": response.status_code,
                    },
                )
        return response

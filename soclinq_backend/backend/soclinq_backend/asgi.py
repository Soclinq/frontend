import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import dashboards.routing

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "soclinq_backend.settings")

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            dashboards.routing.websocket_urlpatterns
        )
    ),
})

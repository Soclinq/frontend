import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from dashboards.middleware import JWTAuthMiddlewareStack
import dashboards.routing

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "soclinq_backend.settings")

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddlewareStack(
        URLRouter(dashboards.routing.websocket_urlpatterns)
    ),
})

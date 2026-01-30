import os
import django
from django.core.asgi import get_asgi_application
from channels.sessions import CookieMiddleware

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "soclinq_backend.settings")
django.setup()

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from websocket.middleware import JWTAuthMiddlewareStack
from websocket.urls import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": CookieMiddleware(
        JWTAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
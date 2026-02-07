import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "soclinq_backend.settings")

import django
django.setup()  # ✅ MUST come before any Django imports that touch models

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from websocket.middleware import WSTokenAuthMiddleware
from websocket.urls import websocket_urlpatterns

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": WSTokenAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        ),
    }
)

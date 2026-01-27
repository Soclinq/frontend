from django.urls import path

from websocket.consumers.responder import ResponderConsumer
from websocket.consumers.stream import StreamOwnerConsumer
from websocket.consumers.admin import AdminConsumer

websocket_urlpatterns = [
    path("ws/responders/", ResponderConsumer.as_asgi()),
    path("ws/stream/", StreamOwnerConsumer.as_asgi()),
    path("ws/admin/", AdminConsumer.as_asgi()),
]

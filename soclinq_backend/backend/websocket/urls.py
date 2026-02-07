from django.urls import path, re_path

from websocket.consumers.responder import ResponderConsumer
from websocket.consumers.stream import StreamOwnerConsumer
from websocket.consumers.admin import AdminConsumer
from websocket.consumers.hub_chat import HubChatConsumer
from websocket.consumers.private_chat import PrivateChatConsumer
websocket_urlpatterns = [
    path("ws/responders/", ResponderConsumer.as_asgi()),
    path("ws/stream/", StreamOwnerConsumer.as_asgi()),
    path("ws/admin/", AdminConsumer.as_asgi()),
    re_path(r"^ws/community-chat/(?P<hub_id>[0-9a-f-]+)/$", HubChatConsumer.as_asgi()),
    re_path(r"^ws/private-chat/(?P<conversation_id>[0-9a-f-]+)/$", PrivateChatConsumer.as_asgi()),
    ]

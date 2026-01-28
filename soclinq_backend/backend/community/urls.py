from django.urls import path
from community.views import NearbyCommunitiesByLocationView, GroupMessagesView

urlpatterns = [
    path("nearby/", NearbyCommunitiesByLocationView.as_view()),
    path("chat/groups/<uuid:group_id>/messages/", GroupMessagesView.as_view()),
]

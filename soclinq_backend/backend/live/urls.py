from django.urls import path
from .views import LiveStreamsListView

urlpatterns = [
    path("streams/", LiveStreamsListView.as_view(), name="live-streams"),
]

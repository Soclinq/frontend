from django.urls import path
from .views import TriggerSOSView, ResolveSOSView, ActiveSOSView, NearbySOSView
from .map_views import SOSMapView
urlpatterns = [
    path("trigger/", TriggerSOSView.as_view()),
    path("resolve/<uuid:sos_id>/", ResolveSOSView.as_view()),
    path("active/", ActiveSOSView.as_view()),
    path("nearby/", NearbySOSView.as_view()),
    path("map/sos/", SOSMapView.as_view()),


]

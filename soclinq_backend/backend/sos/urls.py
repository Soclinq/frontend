from django.urls import path

from .views import (
    SosDraftCreateView,
    SosMediaPresignView,
    SosMediaFinalizeView,
    ActivateSosView,
    ResolveSosView,
    ActiveSosView,
    NearbySosView,
)

from .map_views import SOSMapView

urlpatterns = [
    path("drafts/", SosDraftCreateView.as_view(), name="sos-draft-create"),
    path("media/presign/<uuid:draft_id>/", SosMediaPresignView.as_view(), name="sos-media-presign",),
    path("media/finalize/<uuid:media_id>/", SosMediaFinalizeView.as_view(), name="sos-media-finalize",),
    path("activate/<uuid:draft_id>/", ActivateSosView.as_view(), name="sos-activate",),
    path("resolve/<uuid:sos_id>/", ResolveSosView.as_view(), name="sos-resolve",),
    path("active/", ActiveSosView.as_view(), name="sos-active"),
    path("nearby/", NearbySosView.as_view(), name="sos-nearby"),
    path("map/sos/", SOSMapView.as_view(), name="sos-map"),
]

from django.urls import path
from .views_hq import HQDashboardView
from .views_law import LawEnforcementDashboardView
from .views_ngo import NGODashboardView

urlpatterns = [
    path("hq/", HQDashboardView.as_view()),
    path("law/", LawEnforcementDashboardView.as_view()),
    path("ngo/", NGODashboardView.as_view()),
]

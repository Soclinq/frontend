from django.urls import path
from .views import SubmitReportView, ReviewReportView
from .map_views import ReportsMapView

urlpatterns = [
    path("submit/", SubmitReportView.as_view()),
    path("review/<uuid:report_id>/", ReviewReportView.as_view()),
    path("map/report/", ReportsMapView.as_view()),

]

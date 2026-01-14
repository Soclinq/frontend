from django.urls import path
from .views import MyNotificationsView, MarkNotificationReadView

urlpatterns = [
    path("", MyNotificationsView.as_view()),
    path("read/<uuid:notification_id>/", MarkNotificationReadView.as_view()),
]

from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Notification


class MyNotificationsView(APIView):
    def get(self, request):
        notifications = Notification.objects.filter(
            recipient=request.user
        )[:100]

        data = [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.notification_type,
                "read": n.is_read,
                "time": n.created_at,
            }
            for n in notifications
        ]

        return Response(data)


class MarkNotificationReadView(APIView):
    def post(self, request, notification_id):
        notification = Notification.objects.get(
            id=notification_id,
            recipient=request.user
        )
        notification.is_read = True
        notification.save()
        return Response({"message": "Marked as read"})

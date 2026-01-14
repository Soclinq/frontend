from reports.models import Report
from sos.models import SOSAlert
from community.models import CommunityHub
from django.contrib.auth import get_user_model

User = get_user_model()


def system_overview():
    return {
        "users": User.objects.count(),
        "reports": Report.objects.count(),
        "active_sos": SOSAlert.objects.filter(status="ACTIVE").count(),
        "communities": CommunityHub.objects.count(),
    }

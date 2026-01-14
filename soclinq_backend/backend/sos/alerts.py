from notifications.sms_service import send_sms
from community.models import CommunityMembership, HubRole


def sms_leaders_on_sos(sos):
    leaders = CommunityMembership.objects.filter(
        hub=sos.hub,
        role=HubRole.LEADER,
        is_active=True
    ).select_related("user")

    for leader in leaders:
        if leader.user.phone_number:
            send_sms(
                phone_number=leader.user.phone_number,
                message="🚨 SOS ALERT: Emergency in your community. Check Linqmi app now."
            )

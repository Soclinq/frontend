from notifications.sms_service import send_sms
from community.models import CommunityMembership, MembershipRole


def sms_leaders_on_sos(sos):
    leaders = (
        CommunityMembership.objects.filter(
            hub=sos.hub,
            role=MembershipRole.LEADER,
            is_active=True,
        )
        .select_related("user")
    )

    for membership in leaders:
        phone = getattr(membership.user, "phone_number", None)
        if phone:
            send_sms(
                phone_number=phone,
                message="🚨 SOS ALERT: Emergency in your community. Check Linqmi app now.",
            )

from .permissions import Permissions
from .models import UserRole

ROLE_PERMISSIONS = {
    UserRole.CITIZEN: {
        Permissions.SUBMIT_REPORT,
        Permissions.VIEW_REPORT,
        Permissions.TRIGGER_SOS,
    },

    UserRole.COMMUNITY_LEADER: {
        Permissions.VIEW_REPORT,
        Permissions.MODERATE_HUB,
        Permissions.BROADCAST,
        Permissions.RECEIVE_SOS,
    },

    UserRole.LAW_ENFORCEMENT: {
        Permissions.VIEW_REPORT,
        Permissions.VALIDATE_REPORT,
        Permissions.ASSIGN_REPORT,
        Permissions.VIEW_EVIDENCE,
        Permissions.RECEIVE_SOS,
    },

    UserRole.NGO_PARTNER: {
        Permissions.VIEW_REPORT,  # anonymized only (enforced later)
    },

    UserRole.INVESTIGATOR: {
        Permissions.VIEW_REPORT,
        Permissions.VIEW_EVIDENCE,
        Permissions.EXPORT_EVIDENCE,
    },

    UserRole.HQ_ADMIN: {
        "*",  # full access
    },
}

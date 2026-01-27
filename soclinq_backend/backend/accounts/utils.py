from .rbac import ROLE_PERMISSIONS

def has_permission(user, permission):
    if not user.is_authenticated:
        return False

    role_perms = ROLE_PERMISSIONS.get(user.role, set())

    if "*" in role_perms:
        return True

    return permission in role_perms

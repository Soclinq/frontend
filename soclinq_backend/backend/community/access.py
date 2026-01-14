def user_is_hub_member(user, hub):
    return hub.memberships.filter(user=user, is_active=True).exists()

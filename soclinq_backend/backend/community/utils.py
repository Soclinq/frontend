from .models import CommunityHub, HubLevel, CommunityMembership


def get_or_create_hub(*, level, country, state="", lga="", parent=None):
    hub, _ = CommunityHub.objects.get_or_create(
        level=level,
        country=country,
        state=state,
        lga=lga,
        defaults={
            "name": f"{lga or state or country} {level.title()} Hub",
            "parent": parent,
            "is_verified": level in [HubLevel.STATE, HubLevel.NATIONAL],
        },
    )
    return hub


def auto_assign_user_to_hubs(user):
    # NATIONAL
    national = get_or_create_hub(
        level=HubLevel.NATIONAL,
        country=user.country,
    )

    # STATE
    state = get_or_create_hub(
        level=HubLevel.STATE,
        country=user.country,
        state=user.state,
        parent=national,
    )

    # LGA
    lga = get_or_create_hub(
        level=HubLevel.LGA,
        country=user.country,
        state=user.state,
        lga=user.lga,
        parent=state,
    )

    # LOCAL
    local = get_or_create_hub(
        level=HubLevel.LOCAL,
        country=user.country,
        state=user.state,
        lga=user.lga,
        parent=lga,
    )

    for hub in [local, lga, state, national]:
        CommunityMembership.objects.get_or_create(
            user=user,
            hub=hub,
        )

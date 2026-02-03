from asgiref.sync import sync_to_async
from django.core.cache import cache
from django.utils import timezone


PRESENCE_TTL_SECONDS = 45  # user stays online if pinged within this window


def _presence_key(room: str, user_id: str) -> str:
    return f"presence:{room}:{user_id}"


@sync_to_async
def set_user_online(room: str, user_id: str):
    cache.set(
        _presence_key(room, user_id),
        {
            "online": True,
            "lastSeen": None,
            "updatedAt": timezone.now().isoformat(),
        },
        timeout=PRESENCE_TTL_SECONDS,
    )


@sync_to_async
def set_user_offline(room: str, user_id: str):
    cache.set(
        _presence_key(room, user_id),
        {
            "online": False,
            "lastSeen": timezone.now().isoformat(),
            "updatedAt": timezone.now().isoformat(),
        },
        timeout=PRESENCE_TTL_SECONDS,
    )


@sync_to_async
def get_user_presence(room: str, user_id: str):
    return cache.get(_presence_key(room, user_id))


@sync_to_async
def typing_allowed(room: str, user_id: str) -> bool:
    """
    Server-side typing spam protection:
    allow typing update max once per ~700ms
    """
    key = f"typing_rl:{room}:{user_id}"
    if cache.get(key):
        return False
    cache.set(key, True, timeout=1)
    return True

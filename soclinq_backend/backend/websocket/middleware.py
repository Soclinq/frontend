from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from rest_framework_simplejwt.tokens import AccessToken
from channels.db import database_sync_to_async


User = get_user_model()


@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


class JWTAuthMiddleware:
    """
    Authenticate WebSocket using SimpleJWT stored in cookies.
    Cookie name: access
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        close_old_connections()

        scope["user"] = AnonymousUser()

        cookies = scope.get("cookies") or {}
        token = cookies.get("access")  # ✅ your cookie name is "access"

        if token:
            try:
                decoded = AccessToken(token)
                user_id = decoded["user_id"]  # ✅ IMPORTANT
                scope["user"] = await get_user(user_id)
            except Exception as e:
                scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)

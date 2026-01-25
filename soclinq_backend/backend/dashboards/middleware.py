from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.conf import settings
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token):
    try:
        UntypedToken(token)
    except (InvalidToken, TokenError):
        return None

    from rest_framework_simplejwt.backends import TokenBackend

    backend = TokenBackend(
        algorithm=settings.SIMPLE_JWT["ALGORITHM"],
        signing_key=settings.SECRET_KEY,
    )

    payload = backend.decode(token, verify=True)
    user_id = payload.get("user_id")

    if not user_id:
        return None

    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        scope["user"] = None

        headers = dict(scope.get("headers", []))
        cookies = headers.get(b"cookie", b"").decode()

        token = None
        for cookie in cookies.split(";"):
            if cookie.strip().startswith("access="):
                token = cookie.strip().split("=")[1]

        if token:
            scope["user"] = await get_user_from_token(token)

        return await super().__call__(scope, receive, send)

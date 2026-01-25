from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model

jwt_authenticator = JWTAuthentication()
User = get_user_model()


class JWTAuthMiddleware:
    """
    Safe JWT auth middleware for Django Channels.
    Does NOT import Django models at module load time.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        scope["user"] = None  # <-- IMPORTANT

        token = None

        # 1. Token from query string (?token=...)
        query_string = parse_qs(scope.get("query_string", b"").decode())
        if "token" in query_string:
            token = query_string["token"][0]

        # 2. Token from Authorization header
        headers = dict(scope.get("headers", []))
        auth_header = headers.get(b"authorization")

        if auth_header:
            try:
                token = auth_header.decode().split(" ")[1]
            except Exception:
                token = None

        if token:
            scope["user"] = await self.get_user(token)

        return await self.inner(scope, receive, send)

    @database_sync_to_async
    def get_user(self, token):
        try:
            validated_token = jwt_authenticator.get_validated_token(token)
            return jwt_authenticator.get_user(validated_token)
        except (InvalidToken, TokenError):
            return None

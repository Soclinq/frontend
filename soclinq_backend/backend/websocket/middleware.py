from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from django.conf import settings
from django.contrib.auth import get_user_model
import jwt
from uuid import UUID
from jwt import ExpiredSignatureError, InvalidTokenError

User = get_user_model()


class WSTokenAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        scope["user"] = AnonymousUser()

        try:
            query = parse_qs(scope.get("query_string", b"").decode())
            token = query.get("token", [None])[0]

            if not token:
                return await self.app(scope, receive, send)

            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"],
                options={"require": ["exp", "sub"]},
            )

            if payload.get("scope") != "ws":
                raise InvalidTokenError("Invalid token scope")

            raw_user_id = payload.get("sub")
            if not raw_user_id:
                raise InvalidTokenError("Missing subject")

            # ⭐ CRITICAL FIX
            try:
                user_id = UUID(raw_user_id)
            except Exception:
                user_id = raw_user_id  # fallback for non-UUID PKs

            user = await User.objects.aget(id=user_id, is_active=True)
            scope["user"] = user

        except ExpiredSignatureError:
            print("❌ WS token expired")

        except Exception as e:
            print("❌ WS auth error:", e)

        return await self.app(scope, receive, send)

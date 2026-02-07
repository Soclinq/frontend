from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from django.conf import settings
from django.contrib.auth import get_user_model
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError

User = get_user_model()


class WSTokenAuthMiddleware:
    def __init__(self, app):
        self.app = app  # ✅ REQUIRED

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
                options={
                    "require": ["exp", "sub"],
                },
            )

            # 🔒 Enforce WS-only tokens
            if payload.get("scope") != "ws":
                raise InvalidTokenError("Invalid token scope")

            user_id = payload.get("sub")
            if not user_id:
                raise InvalidTokenError("Missing subject")

            user = await User.objects.aget(id=user_id, is_active=True)
            scope["user"] = user

        except ExpiredSignatureError:
            # token expired → anonymous
            pass

        except (InvalidTokenError, User.DoesNotExist):
            pass

        except Exception:
            # never crash ASGI
            pass

        return await self.app(scope, receive, send)

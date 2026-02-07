# websocket/ws_tokens.py
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
import jwt

WS_TOKEN_TTL = 60  # seconds

def issue_ws_token(user):
    payload = {
        "sub": str(user.id),
        "scope": "ws",
        "iat": timezone.now(),
        "exp": timezone.now() + timedelta(seconds=WS_TOKEN_TTL),
    }

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm="HS256",
    )

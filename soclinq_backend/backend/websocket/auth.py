from urllib.parse import parse_qs
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


jwt_authenticator = JWTAuthentication()


def authenticate_ws(scope):
    """
    Authenticate a WebSocket connection using JWT.
    Token is passed as: ws://.../?token=JWT
    """

    try:
        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)

        token = query_params.get("token", [None])[0]
        if not token:
            return None

        validated_token = jwt_authenticator.get_validated_token(token)
        user = jwt_authenticator.get_user(validated_token)

        if not user or not user.is_active:
            return None

        return user

    except AuthenticationFailed:
        return None
    except Exception:
        # Never crash a WS handshake
        return None

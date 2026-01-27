from django.contrib.auth import get_user_model
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.middleware.csrf import get_token
from django.utils.deprecation import MiddlewareMixin

User = get_user_model()

def get_user_by_identifier(identifier):
    """
    Identifier can be phone number or email
    """
    if not identifier:
        return None

    if "@" in identifier:
        return User.objects.filter(email__iexact=identifier).first()

    return User.objects.filter(phone_number=identifier).first()


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        raw_token = request.COOKIES.get("access")
        if not raw_token:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            return (user, validated_token)
        except Exception as e:
            print("❌ CookieJWTAuthentication failed:", str(e))
            return None


class EnsureCSRFCookieMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        # This forces Django to set csrftoken cookie if missing
        get_token(request)
        return response

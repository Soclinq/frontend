from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import OTP
from .otp_utils import generate_otp
from .auth_utils import get_user_by_identifier
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from rest_framework_simplejwt.tokens import RefreshToken
from .auth_utils import get_user_by_identifier
from audit.utils import log_action
from community.utils import auto_assign_user_to_hubs
from notifications.channels import send_otp_notification


User = get_user_model()


class RegisterView(APIView):
    authentication_classes = []

    def post(self, request):
        identifier = request.data.get("identifier")  # phone or email
        password = request.data.get("password")
        username = request.data.get("username")

        if not identifier or not password or not username:
            return Response(
                {"error": "identifier, username and password are required"},
                status=400,
            )

        if get_user_by_identifier(identifier):
            return Response(
                {"error": "User already exists"},
                status=400,
            )

        user_data = {"username": username}

        if "@" in identifier:
            user_data["email"] = identifier
        else:
            user_data["phone_number"] = identifier

        user = User.objects.create_user(
            password=password,
            **user_data
        )

        otp = generate_otp()
        OTP.objects.create(user=user, code=otp, purpose="VERIFY")

        # send OTP via SMS or Email (later)
        send_otp_notification(
            user=user,
            otp=otp,
            purpose="VERIFY"
        )

        log_action(
                user=user,
                action="CREATE",
                object_type="ExternalNotification",
                metadata={
                    "channel": "SMS",
                    "provider": "Termii"
                }
            )
        return Response({"message": "Registration OTP sent"})




class LoginView(APIView):
    authentication_classes = []

    def post(self, request):
        identifier = request.data.get("identifier")  # phone or email
        password = request.data.get("password")

        user = get_user_by_identifier(identifier)

        if not user:
            return Response({"error": "Invalid credentials"}, status=401)

        # Account lock check (PDF rule)
        if user.lock_until and user.lock_until > timezone.now():
            return Response(
                {"error": "Account locked. Try again later."},
                status=403
            )

        auth_user = authenticate(
            request,
            phone_number=user.phone_number,
            password=password
        )

        if not auth_user:
            user.failed_login_attempts += 1

            if user.failed_login_attempts == 1:
                user.lock_until = timezone.now() + timedelta(minutes=5)
            elif user.failed_login_attempts == 2:
                user.lock_until = timezone.now() + timedelta(minutes=10)
            elif user.failed_login_attempts >= 3:
                user.is_suspended = True

            user.save()
            return Response({"error": "Invalid credentials"}, status=401)

        # Reset counters on success
        user.failed_login_attempts = 0
        user.lock_until = None
        user.save()

        otp = generate_otp()
        OTP.objects.create(user=user, code=otp, purpose="LOGIN")

        send_otp_notification(
            user=user,
            otp=otp,
            purpose="VERIFY"
        )

        # send OTP via SMS/email
        log_action(
            user=user,
            action="LOGIN",
            request=request,
            metadata={"method": "password+otp"},
        )
        return Response({"message": "OTP sent"})



class VerifyOTPView(APIView):
    authentication_classes = []

    def post(self, request):
        identifier = request.data.get("identifier")
        code = request.data.get("otp")
        purpose = request.data.get("purpose")  # LOGIN or VERIFY

        user = get_user_by_identifier(identifier)

        if not user:
            return Response({"error": "Invalid request"}, status=400)

        otp = OTP.objects.filter(
            user=user,
            code=code,
            purpose=purpose,
            is_used=False
        ).first()

        if not otp or otp.is_expired():
            return Response({"error": "Invalid or expired OTP"}, status=400)

        otp.is_used = True
        otp.save()

        # Activate user on verification
        if purpose == "VERIFY":
            user.is_verified = True
            user.save()
            return Response({"message": "Account verified successfully"})

        # LOGIN → issue JWT
        refresh = RefreshToken.for_user(user)

        log_action(
            user=user,
            action="OTP_VERIFY",
            request=request,
        )

        auto_assign_user_to_hubs(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })

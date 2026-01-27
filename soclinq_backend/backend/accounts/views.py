from rest_framework.views import APIView
from rest_framework.response import Response
from .models import OTP, Organization, VerificationDocument
from .otp_utils import generate_otp
from .auth_utils import get_user_by_identifier, CookieJWTAuthentication
from datetime import timedelta
from rest_framework_simplejwt.tokens import RefreshToken
from audit.utils import log_action
from community.utils import auto_assign_user_to_hubs
from notifications.channels import send_otp_notification
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import get_user_model, authenticate
from .serializers import RegisterSubmitSerializer
from django.utils import timezone
from django.db import transaction
from django.middleware.csrf import get_token
from django.conf import settings
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.permissions import IsAuthenticated
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from django.db import IntegrityError, transaction


User = get_user_model()
same_site = "Lax"
secure_cookie = False




@method_decorator(csrf_exempt, name="dispatch")
class SendOTPView(APIView):
    authentication_classes = []
    permission_classes = []

    @transaction.atomic
    def post(self, request):
        identifier = request.data.get("identifier")
        print("in route")
        user = None

        try:
            # 1️⃣ Validate identifier
            if not identifier:
                log_action(
                    action="OTP_VERIFY",
                    request=request,
                    was_successful=False,
                    metadata={"reason": "Missing identifier"},
                )
                return Response(
                    {"error": "Identifier is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # 2️⃣ Prevent duplicate users
            if get_user_by_identifier(identifier):
                log_action(
                    action="OTP_VERIFY",
                    request=request,
                    was_successful=False,
                    metadata={
                        "identifier": identifier,
                        "reason": "User already exists",
                    },
                )
                return Response(
                    {"error": "User already exists"},
                    status=status.HTTP_400_BAD_REQUEST,
                )



            # 5️⃣ Generate and store OTP
            # otp = generate_otp()
            otp = 123456
            OTP.objects.create(
                identifier=identifier,
                code=otp,
                purpose="VERIFY",
            )

            # 6️⃣ Send OTP
            # send_otp_notification(
            #     identifier=identifier,
            #     otp=otp,
            #     purpose="VERIFY",
            # )

            # 7️⃣ Log success
            log_action(
                action="OTP_VERIFY",
                object_type="Registration",
                request=request,
                was_successful=True,
                metadata={"identifier": identifier},
            )

            return Response(
                {"message": "Verification code sent"},
                status=status.HTTP_200_OK,
            )

        except Exception as exc:
            # Any failure rolls back automatically due to atomic
            log_action(
                user=user,
                action="OTP_VERIFY",
                object_type="Registration",
                request=request,
                was_successful=False,
                metadata={
                    "identifier": identifier,
                    "error": str(exc),
                },
            )

            return Response(
                {"error": "Unable to send verification code"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class VerifyOTPView(APIView):
    authentication_classes = []

    @transaction.atomic
    def post(self, request):
        identifier = request.data.get("identifier")
        code = request.data.get("otp")

        if not identifier or not code:
            return Response(
                {"error": "Identifier and OTP are required"},
                status=400
            )

        user = get_user_by_identifier(identifier)


        # 🔐 Block re-verification
        if user:
            return Response(
                {"error": "User already verified. Please proceed to registration."},
                status=400
            )

        # 🔐 Validate OTP (lock row to prevent reuse)
        otp = OTP.objects.select_for_update().filter(
            identifier=identifier,
            code=code,
            purpose="VERIFY",
            is_used=False
        ).first()

        print(str(otp.code))

        if not otp or otp.is_expired():
            return Response(
                {"error": "Invalid or expired OTP"},
                status=400
            )

        otp.save(update_fields=["is_used"])


        log_action(
            user=user,
            action="OTP_VERIFY",
            request=request,
        )

        return Response(
            {"message": "Email verification successful"},
            status=200
        )
    

class RegisterSubmitView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    authentication_classes = []

    @transaction.atomic
    def post(self, request):
        serializer = RegisterSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        identifier = data["email"]
        otp_code = data["otp"]
        password = data["password"]

        try:
            if get_user_by_identifier(identifier):
                raise ValueError("User already exists")

            otp = OTP.objects.select_for_update().filter(
                identifier=identifier,
                code=otp_code,
                purpose="VERIFY",
                is_used=False,
            ).first()

            if not otp or otp.is_expired():
                raise ValueError("Invalid or expired OTP")

            otp.is_used = True
            otp.save(update_fields=["is_used"])

            user = User.objects.create_user(
                email=identifier,
                phone_number=data.get("phone"),
                username=User.objects.generate_username(identifier),
                password=password,
            )

            user.full_name = data["fullName"]
            user.is_verified = True
            user.save(update_fields=["full_name", "is_verified"])

            if data["role"] == "ORG":
                Organization.objects.create(
                    name=data["orgName"],
                    org_type=data["orgType"],
                    org_type_other=data.get("orgTypeOther", ""),
                    address=data.get("address", ""),
                    owner=user,
                )

            for file in data.get("documents", []):
                VerificationDocument.objects.create(
                    user=user,
                    file=file,
                )

            refresh = RefreshToken.for_user(user)
            secure_cookie = not settings.DEBUG

            response = Response(
                {"message": "Registration completed successfully"},
                status=status.HTTP_201_CREATED,
            )


            response.set_cookie(
                key="access",
                value=str(refresh.access_token),
                httponly=True,
                secure=secure_cookie,
                samesite=same_site,
            )

            response.set_cookie(
                key="refresh",
                value=str(refresh),
                httponly=True,
                secure=secure_cookie,
                samesite=same_site,
            )


            # ✅ Success log
            log_action(
                user=user,
                action="REGISTER_COMPLETE",
                request=request,
                was_successful=True,
                metadata={
                    "role": data["role"],
                    "documents": len(data.get("documents", [])),
                },
            )

            return response

        except ValueError as exc:
            log_action(
                action="REGISTER_FAILED",
                request=request,
                was_successful=False,
                metadata={
                    "identifier": identifier,
                    "reason": str(exc),
                },
            )
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except IntegrityError as exc:
            log_action(
                action="REGISTER_FAILED",
                request=request,
                was_successful=False,
                metadata={
                    "identifier": identifier,
                    "error": "Database integrity error",
                },
            )
            return Response(
                {
                    "error": (
                        "A conflicting record already exists. "
                        "Please review your information."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as exc:
            log_action(
                action="REGISTER_FAILED",
                request=request,
                was_successful=False,
                metadata={
                    "identifier": identifier,
                    "error": str(exc),
                },
            )
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

@method_decorator(csrf_exempt, name="dispatch")
class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    @transaction.atomic
    def post(self, request):
        identifier = request.data.get("identifier")
        password = request.data.get("password")

        if not identifier or not password:
            return Response(
                {"error": "Invalid credentials"},
                status=400
            )

        user = get_user_by_identifier(identifier)

        # Prevent user enumeration
        if not user or not user.is_active:
            return Response(
                {"error": "Invalid credentials"},
                status=401
            )

        # Suspended account
        if user.is_suspended:
            return Response(
                {"error": "Account suspended. Contact support."},
                status=403
            )

        # Temporary lock
        if user.lock_until and user.lock_until > timezone.now():
            remaining = int(
                (user.lock_until - timezone.now()).total_seconds() / 60
            ) + 1
            return Response(
                {"error": f"Account locked. Try again in {remaining} minutes."},
                status=403
            )

        auth_user = authenticate(
            request=request,
            phone_number=user.phone_number,
            password=password
        )

        if not auth_user:
            # Failed attempt
            user.failed_login_attempts += 1

            if user.failed_login_attempts == 1:
                user.lock_until = timezone.now() + timedelta(minutes=5)
            elif user.failed_login_attempts == 2:
                user.lock_until = timezone.now() + timedelta(minutes=10)
            elif user.failed_login_attempts >= 3:
                user.is_suspended = True

            user.save(update_fields=[
                "failed_login_attempts",
                "lock_until",
                "is_suspended"
            ])

            log_action(
                user=user,
                action="LOGIN_FAILED",
                request=request,
                metadata={"reason": "invalid_password"},
            )

            return Response(
                {"error": "Invalid credentials"},
                status=401
            )

        # ✅ Successful login → reset counters
        user.failed_login_attempts = 0
        user.lock_until = None
        user.save(update_fields=["failed_login_attempts", "lock_until"])

        # ✅ Issue JWT tokens
        refresh = RefreshToken.for_user(user)

        secure_cookie = not settings.DEBUG

        response = Response(
            {"message": "Login successful"},
            status=200
        )


        response.set_cookie(
            "access",
            str(refresh.access_token),
            httponly=True,
            secure=secure_cookie,
            samesite=same_site,
            path="/",
            max_age=15 * 60,
        )

        response.set_cookie(
            "refresh",
            str(refresh),
            httponly=True,
            secure=secure_cookie,
            samesite=same_site,
            path="/",
            max_age=7 * 24 * 60 * 60,
        )


        log_action(
            user=user,
            action="LOGIN_SUCCESS",
            request=request,
            metadata={"method": "password"},
        )

        return response



@method_decorator(csrf_exempt, name="dispatch")
class RefreshView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh")

        if not refresh_token:
            return Response({"error": "No refresh token"}, status=401)

        try:
            refresh = RefreshToken(refresh_token)
            new_access = refresh.access_token
        except TokenError:
            return Response({"error": "Invalid refresh token"}, status=401)

        response = Response({"message": "Token refreshed"}, status=200)

        response.set_cookie(
            key="access",
            value=str(new_access),
            httponly=True,
            secure=secure_cookie,
            samesite=same_site,
            path="/",
            max_age=15 * 60,
        )

        # ✅ also re-set refresh cookie so browser stays consistent
        response.set_cookie(
            key="refresh",
            value=str(refresh),
            httponly=True,
            secure=secure_cookie,
            samesite=same_site,
            path="/",
            max_age=7 * 24 * 60 * 60,
        )

        return response

@method_decorator(csrf_exempt, name="dispatch")
class MeView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    def get(self, request):
        print("✅ COOKIES:", request.COOKIES)
        print("✅ ACCESS:", request.COOKIES.get("access"))
        print("✅ USER:", request.user, request.user.is_authenticated)

        user = request.user
        return Response({
            "user": {
                "id": str(user.id),
                "email": user.email,
                "phone": user.phone_number,
                "username": user.username,
                "fullName": user.full_name,
                "role": user.role,
                "isVerified": user.is_verified,
                "isStaff": user.is_staff,
                "preferredLanguage": user.preferred_language,
                "location": {
                    "country": user.country,
                    "state": user.state,
                    "lga": user.lga,
                },
            }
        })



class CSRFView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({
            "csrfToken": get_token(request)
        })


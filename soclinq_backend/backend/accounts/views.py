from __future__ import annotations
import re

from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ( OTP, Organization, VerificationDocument, UsernameRegistry,
                     UsernameEntityType, UsernameTier, UsernameStatus,
                    ReservedUsername, ReservedUsernameType, User, UsernameRegistry, 
                    EmergencyContact, ProfileSettings, AccountDeletionRequest

                    )
from .otp_utils import generate_otp
from .auth_utils import get_user_by_identifier, CookieJWTAuthentication
from datetime import timedelta
from rest_framework_simplejwt.tokens import RefreshToken
from audit.utils import log_action
from notifications.channels import send_otp_notification
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import get_user_model, authenticate
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
from .utils import update_user_location, normalize_username, validate_username_format, MeSerializer
import uuid
import random
from django.core.files.storage import default_storage
from .serializers import RegisterSubmitSerializer, DeviceSettingsUpdateSerializer


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
        location = request.data.get("location") or {}

        if not identifier or not password:
            return Response({"error": "Invalid credentials"}, status=400)

        user = get_user_by_identifier(identifier)

        if not user or not user.is_active:
            return Response({"error": "Invalid credentials"}, status=401)

        if user.is_suspended:
            return Response(
                {"error": "Account suspended. Contact support."},
                status=403,
            )

        if user.lock_until and user.lock_until > timezone.now():
            remaining = int(
                (user.lock_until - timezone.now()).total_seconds() / 60
            ) + 1
            return Response(
                {"error": f"Account locked. Try again in {remaining} minutes."},
                status=403,
            )

        auth_user = authenticate(
            request=request,
            phone_number=user.phone_number,
            password=password,
        )

        if not auth_user:
            # existing failed-attempt logic (unchanged)
            ...
            return Response({"error": "Invalid credentials"}, status=401)

        # ✅ SUCCESS
        user.failed_login_attempts = 0
        user.lock_until = None
        user.save(update_fields=["failed_login_attempts", "lock_until"])

        # 📍 Update location (NON-BLOCKING)
        try:
            update_user_location(
                user=user,
                lat=location.get("lat"),
                lng=location.get("lng"),
                source=location.get("source", "UNKNOWN"),
            )
        except Exception:
            pass  # never block login

        refresh = RefreshToken.for_user(user)

        response = Response({"message": "Login successful"}, status=200)

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

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    def get(self, request):
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
                    "source": user.location_source,
                    "confidence": user.location_confidence,
                    "coordinates": (
                        {
                            "lat": user.last_known_location.y,
                            "lng": user.last_known_location.x,
                        }
                        if user.last_known_location
                        else None
                    ),
                    "admin": {
                        "0": user.admin_0 and user.admin_0.name,
                        "1": user.admin_1 and user.admin_1.name,
                        "2": user.admin_2 and user.admin_2.name,
                    },
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




class ProfileUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user

        full_name = (request.data.get("full_name") or "").strip()
        preferred_language = (request.data.get("preferred_language") or "").strip()

        # phone change handled ONLY by OTP flow
        phone_number = request.data.get("phone_number")

        if phone_number is not None:
            return Response(
                {"error": "Phone number changes require OTP verification."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if full_name and len(full_name) > 255:
            return Response(
                {"error": "Full name is too long."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if preferred_language and len(preferred_language) > 20:
            return Response(
                {"error": "Invalid preferred language."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if full_name != "":
            user.full_name = full_name

        if preferred_language != "":
            user.preferred_language = preferred_language

        user.last_updated = timezone.now()
        user.save(update_fields=["full_name", "preferred_language", "last_updated"])

        return Response(
            {
                "message": "Profile updated successfully",
                "profile": MeSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


# ===========================
# ✅ POST /profile/photo/
# ===========================

class ProfilePhotoUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        photo = request.FILES.get("photo")
        if not photo:
            return Response(
                {"error": "Missing photo file"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # basic validation
        if photo.size > 2 * 1024 * 1024:
            return Response(
                {"error": "Max photo size is 2MB"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed = ["image/jpeg", "image/png", "image/webp"]
        if getattr(photo, "content_type", "") not in allowed:
            return Response(
                {"error": "Invalid file type. Only jpg/png/webp allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ store using Django storage (works with S3 if configured)
        key = f"users/live_photos/{user.id}/{uuid.uuid4().hex}.webp"
        saved_path = default_storage.save(key, photo)

        # Most storages expose URL
        photo_url = default_storage.url(saved_path)

        user.live_photo = photo_url
        user.save(update_fields=["live_photo"])

        return Response(
            {
                "message": "Photo updated successfully",
                "photo_url": photo_url,
            },
            status=status.HTTP_200_OK,
        )


# ===========================
# ✅ GET /usernames/check/?username=...
# ===========================

class UsernameCheckView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        username = normalize_username(request.query_params.get("username"))
        err = validate_username_format(username)

        if err:
            return Response(
                {"available": False, "reason": err},
                status=status.HTTP_200_OK,
            )

        uname_lower = username.lower()

        # ✅ reserved words check
        reserved = ReservedUsername.objects.filter(username_lower=uname_lower).first()
        if reserved:
            return Response(
                {
                    "available": False,
                    "reason": f"Reserved ({reserved.reserved_type})",
                },
                status=status.HTTP_200_OK,
            )

        # ✅ already taken
        exists = UsernameRegistry.objects.filter(username_lower=uname_lower, is_active=True).exists()
        if exists:
            return Response(
                {"available": False, "reason": "Username already taken"},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"available": True, "reason": "Available"},
            status=status.HTTP_200_OK,
        )


# ===========================
# ✅ POST /usernames/claim/
# Body: { username, entity_type: "USER", entity_id }
# ===========================

class UsernameClaimView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        username = normalize_username(request.data.get("username"))
        entity_type = request.data.get("entity_type")
        entity_id = request.data.get("entity_id")

        if entity_type != "USER":
            return Response(
                {"error": "Only USER usernames can be claimed here."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not entity_id or str(entity_id) != str(user.id):
            return Response(
                {"error": "Invalid entity id"},
                status=status.HTTP_403_FORBIDDEN,
            )

        err = validate_username_format(username)
        if err:
            return Response({"error": err}, status=status.HTTP_400_BAD_REQUEST)

        uname_lower = username.lower()

        # ✅ reserved words enforcement
        reserved = ReservedUsername.objects.filter(username_lower=uname_lower).first()
        if reserved:
            if reserved.reserved_type == ReservedUsernameType.BLOCKED:
                return Response(
                    {"error": "This username is blocked."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if reserved.reserved_type == ReservedUsernameType.SYSTEM:
                return Response(
                    {"error": "This username is reserved for the system."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if reserved.reserved_type == ReservedUsernameType.RESTRICTED:
                # ✅ allow only HQ_ADMIN or verified users
                if not user.is_verified and user.role not in ["HQ_ADMIN", "LAW_ENFORCEMENT"]:
                    return Response(
                        {"error": "This username requires verification/admin approval."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

        with transaction.atomic():
            # ✅ prevent stealing taken username
            if UsernameRegistry.objects.filter(username_lower=uname_lower, is_active=True).exists():
                return Response(
                    {"error": "Username already taken"},
                    status=status.HTTP_409_CONFLICT,
                )

            # ✅ disable old registry record for this user
            UsernameRegistry.objects.filter(user=user, is_active=True).update(is_active=False)

            UsernameRegistry.objects.create(
                username=username,
                username_lower=uname_lower,
                entity_type=UsernameEntityType.USER,
                tier=UsernameTier.PUBLIC,
                status=UsernameStatus.ACTIVE,
                user=user,
                created_by=user,
            )

            # keep user.username for convenience
            user.username = username
            user.save(update_fields=["username"])

        return Response(
            {
                "message": "Username claimed successfully",
                "username": username,
            },
            status=status.HTTP_200_OK,
        )


# ===========================
# ✅ POST /auth/phone/send-otp/
# Body: { phone_number }
# ===========================

class SendPhoneOTPView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        phone_number = (request.data.get("phone_number") or "").strip()
        if not phone_number:
            return Response(
                {"error": "Phone number is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(phone_number) < 7 or len(phone_number) > 20:
            return Response(
                {"error": "Invalid phone number"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ prevent using phone already registered
        exists = User.objects.filter(phone_number=phone_number).exclude(id=user.id).exists()
        if exists:
            return Response(
                {"error": "Phone number already in use"},
                status=status.HTTP_409_CONFLICT,
            )

        # ✅ generate OTP
        code = f"{random.randint(0, 999999):06d}"

        OTP.objects.create(
            identifier=phone_number,
            code="123456",
            purpose="VERIFY",
            is_used=False,
        )

        # ✅ TODO: integrate SMS provider here
        # send_sms(phone_number, f"Your SOS App OTP is {code}")

        return Response(
            {
                "message": "OTP sent successfully",
                "cooldown": 60,
            },
            status=status.HTTP_200_OK,
        )


# ===========================
# ✅ POST /auth/phone/verify-otp/
# Body: { phone_number, code }
# ===========================

class VerifyPhoneOTPView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        phone_number = (request.data.get("phone_number") or "").strip()
        code = request.data.get("code")

        if not phone_number or not code:
            return Response(
                {"error": "Phone number and OTP code are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(code) != 6:
            return Response(
                {"error": "OTP must be 6 digits"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ get latest OTP for this identifier
        otp = (
            OTP.objects.filter(identifier=phone_number, purpose="VERIFY", is_used=False)
            .order_by("-created_at")
            .first()
        )

        if not otp:
            return Response(
                {"error": "No OTP found or OTP already used"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # ✅ expiry (your model uses 5 minutes-ish logic)
        if otp.is_expired():
            return Response(
                {"error": "OTP expired"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp.code != "123456":
            return Response(
                {"error": "Invalid OTP code"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ mark used
        otp.is_used = True
        otp.save(update_fields=["is_used"])

        # ✅ apply new phone number
        exists = User.objects.filter(phone_number=phone_number).exclude(id=user.id).exists()
        if exists:
            return Response(
                {"error": "Phone number already taken"},
                status=status.HTTP_409_CONFLICT,
            )

        user.phone_number = phone_number
        user.is_verified = True  # optional: mark verified after phone OTP
        user.save(update_fields=["phone_number", "is_verified"])

        return Response(
            {
                "message": "Phone verified successfully",
                "profile": MeSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )




from django.utils import timezone
from django.db import transaction
from django.conf import settings

from rest_framework import status, serializers
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import User, OTP




# ============================
# ✅ Serializers
# ============================

class AdminUnitMiniSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    level = serializers.IntegerField()
    code = serializers.CharField(required=False, allow_null=True)
    country_code = serializers.CharField(required=False, allow_null=True)


class GeoPointSerializer(serializers.Serializer):
    lat = serializers.FloatField()
    lng = serializers.FloatField()


class UserDeviceInfoSerializer(serializers.Serializer):
    imei = serializers.CharField(required=False, allow_null=True)
    sim_number = serializers.CharField(required=False, allow_null=True)
    phone_model = serializers.CharField(required=False, allow_null=True)
    last_ip_address = serializers.CharField(required=False, allow_null=True)
    push_token = serializers.CharField(required=False, allow_null=True)
    platform = serializers.ChoiceField(
        choices=["WEB", "ANDROID", "IOS"], required=False, allow_null=True
    )
    app_version = serializers.CharField(required=False, allow_null=True)
    last_seen_at = serializers.CharField(required=False, allow_null=True)


class ProfileSecurityStateSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()
    is_suspended = serializers.BooleanField()
    failed_login_attempts = serializers.IntegerField()
    lock_until = serializers.DateTimeField(required=False, allow_null=True)
    is_staff = serializers.BooleanField()
    is_verified = serializers.BooleanField()


class ProfileLocationStateSerializer(serializers.Serializer):
    last_known_location = GeoPointSerializer(required=False, allow_null=True)
    location_source = serializers.ChoiceField(choices=["GPS", "IP", "MANUAL", "UNKNOWN"])
    location_confidence = serializers.ChoiceField(choices=["HIGH", "MEDIUM", "LOW"])

    admin_0 = AdminUnitMiniSerializer(required=False, allow_null=True)
    admin_1 = AdminUnitMiniSerializer(required=False, allow_null=True)
    admin_2 = AdminUnitMiniSerializer(required=False, allow_null=True)

    location_updated_at = serializers.DateTimeField(required=False, allow_null=True)


class ProfileIdentitySerializer(serializers.Serializer):
    id = serializers.CharField()
    email = serializers.EmailField(required=False, allow_null=True)
    phone_number = serializers.CharField()

    username = serializers.CharField(required=False, allow_null=True)
    full_name = serializers.CharField(required=False, allow_null=True)

    preferred_language = serializers.CharField()
    live_photo = serializers.CharField(required=False, allow_null=True)


class ProfileAuditSerializer(serializers.Serializer):
    date_joined = serializers.DateTimeField()
    last_updated = serializers.DateTimeField()


class ProfileSettingsSerializer(serializers.Serializer):
    # keep flexible (since your model isn't added yet)
    emergency_mode_enabled = serializers.BooleanField(required=False)
    tracking_enabled = serializers.BooleanField(required=False)
    location_enabled = serializers.BooleanField(required=False)
    allow_location_sharing = serializers.BooleanField(required=False)
    allow_anonymous_reports = serializers.BooleanField(required=False)
    allow_push_notifications = serializers.BooleanField(required=False)
    allow_messages_from = serializers.ChoiceField(
        choices=["EVERYONE", "CONTACTS_ONLY", "VERIFIED_ONLY"],
        required=False
    )
    allow_device_binding = serializers.BooleanField(required=False)
    allow_media_upload = serializers.BooleanField(required=False)
    searchable_by_username = serializers.BooleanField(required=False)
    hide_last_seen = serializers.BooleanField(required=False)

    sos_silent_mode = serializers.BooleanField(required=False)
    sos_countdown_seconds = serializers.IntegerField(required=False)

    sos_auto_call_enabled = serializers.BooleanField(required=False)
    sos_auto_share_location = serializers.BooleanField(required=False)
    sos_auto_record_audio = serializers.BooleanField(required=False)

    quiet_hours_enabled = serializers.BooleanField(required=False)
    quiet_hours_start = serializers.CharField(required=False, allow_null=True)
    quiet_hours_end = serializers.CharField(required=False, allow_null=True)


class UserProfileSerializer(serializers.Serializer):
    identity = ProfileIdentitySerializer()
    role = serializers.CharField()

    location = ProfileLocationStateSerializer()
    device = UserDeviceInfoSerializer()
    security = ProfileSecurityStateSerializer()

    settings = ProfileSettingsSerializer(required=False)
    audit = ProfileAuditSerializer()


class ProfileUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(required=False, allow_blank=True)
    preferred_language = serializers.CharField(required=False)

    # You can allow email update only if your business logic supports it.
    email = serializers.EmailField(required=False, allow_null=True)


class UploadPhotoSerializer(serializers.Serializer):
    photo = serializers.ImageField()


class PhoneOtpRequestSerializer(serializers.Serializer):
    phone_number = serializers.CharField()

    def validate_phone_number(self, value: str) -> str:
        v = (value or "").strip()
        if len(v) < 7:
            raise serializers.ValidationError("Invalid phone number")
        return v


# ============================
# ✅ Helpers
# ============================

def _serialize_admin_unit(unit):
    if not unit:
        return None
    return {
        "id": str(unit.id),
        "name": getattr(unit, "name", ""),
        "level": getattr(unit, "level", 0),
        "code": getattr(unit, "code", None),
        "country_code": getattr(unit, "country_code", None),
    }


def build_profile_payload(user) -> dict:
    # ✅ Safe conversion of geo
    last_loc = None
    if getattr(user, "last_known_location", None):
        try:
            last_loc = {
                "lat": float(user.last_known_location.y),
                "lng": float(user.last_known_location.x),
            }
        except Exception:
            last_loc = None

    # ✅ fetch OneToOne settings safely
    settings_obj = getattr(user, "profile_settings", None)

    # ✅ emergency contacts always from related_name="emergency_contacts"
    def serialize_emergency_contacts():
        qs = getattr(user, "emergency_contacts", None)
        if not qs or not hasattr(qs, "all"):
            return []

        return [
            {
                "id": str(c.id),
                "name": c.name or "",
                "phone": str(c.phone or ""),
                "relationship": c.relationship or "OTHER",
                "priority": c.priority,
                "verified": bool(c.verified),
                "created_at": c.created_at,
            }
            for c in qs.all()
        ]

    payload = {
        "identity": {
            "id": str(user.id),
            "email": user.email or None,
            "phone_number": str(user.phone_number or ""),

            "username": user.username or None,
            "full_name": user.full_name or None,

            "preferred_language": user.preferred_language or "en",
            "live_photo": user.live_photo.url if user.live_photo else None,
        },

        "role": user.role,

        "location": {
            "last_known_location": last_loc,
            "location_source": user.location_source or "UNKNOWN",
            "location_confidence": user.location_confidence or "LOW",

            "admin_0": _serialize_admin_unit(getattr(user, "admin_0", None)),
            "admin_1": _serialize_admin_unit(getattr(user, "admin_1", None)),
            "admin_2": _serialize_admin_unit(getattr(user, "admin_2", None)),

            "location_updated_at": user.location_updated_at,
        },

        "device": {
            "imei": getattr(user, "imei", None),
            "sim_number": getattr(user, "sim_number", None),
            "phone_model": getattr(user, "phone_model", None),
            "last_ip_address": getattr(user, "last_ip_address", None),

            "push_token": getattr(user, "push_token", None),
            "platform": getattr(user, "platform", None),
            "app_version": getattr(user, "app_version", None),
            "last_seen_at": getattr(user, "last_seen_at", None),
        },

        "security": {
            "is_active": bool(user.is_active),
            "is_suspended": bool(user.is_suspended),

            "failed_login_attempts": int(user.failed_login_attempts or 0),
            "lock_until": user.lock_until,

            "is_staff": bool(user.is_staff),
            "is_verified": bool(user.is_verified),
        },

        # ✅ THIS is the right place
        "settings": {
            "emergency_mode_enabled": bool(
                getattr(settings_obj, "emergency_mode_enabled", False)
            ),

            "emergency_contacts": serialize_emergency_contacts(),

            "tracking_enabled": bool(getattr(settings_obj, "tracking_enabled", True)),
            "location_enabled": bool(getattr(settings_obj, "location_enabled", True)),

            "allow_location_sharing": bool(
                getattr(settings_obj, "allow_location_sharing", True)
            ),
            "allow_anonymous_reports": bool(
                getattr(settings_obj, "allow_anonymous_reports", True)
            ),

            "allow_push_notifications": bool(
                getattr(settings_obj, "allow_push_notifications", True)
            ),

            "allow_messages_from": getattr(settings_obj, "allow_messages_from", "EVERYONE") or "EVERYONE",

            "allow_device_binding": bool(
                getattr(settings_obj, "allow_device_binding", True)
            ),
            "allow_media_upload": bool(
                getattr(settings_obj, "allow_media_upload", True)
            ),

            "searchable_by_username": bool(
                getattr(settings_obj, "searchable_by_username", True)
            ),
            "hide_last_seen": bool(getattr(settings_obj, "hide_last_seen", False)),

            "sos_silent_mode": bool(getattr(settings_obj, "sos_silent_mode", False)),
            "sos_countdown_seconds": int(
                getattr(settings_obj, "sos_countdown_seconds", 5) or 5
            ),

            "sos_auto_call_enabled": bool(
                getattr(settings_obj, "sos_auto_call_enabled", False)
            ),
            "sos_auto_share_location": bool(
                getattr(settings_obj, "sos_auto_share_location", True)
            ),
            "sos_auto_record_audio": bool(
                getattr(settings_obj, "sos_auto_record_audio", False)
            ),

            "quiet_hours_enabled": bool(
                getattr(settings_obj, "quiet_hours_enabled", False)
            ),
            "quiet_hours_start": getattr(settings_obj, "quiet_hours_start", None),
            "quiet_hours_end": getattr(settings_obj, "quiet_hours_end", None),
        },

        "audit": {
            "date_joined": user.date_joined,
            "last_updated": user.last_updated,
        },
    }

    return payload

# ============================
# ✅ 1) GET /profile/me/
# ============================

class ProfileMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        print(str(user))
        return Response(build_profile_payload(user), status=status.HTTP_200_OK)


# ============================
# ✅ 2) PATCH /profile/update/
# ============================

class ProfileUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @transaction.atomic
    def patch(self, request):
        user = request.user

        serializer = ProfileUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "full_name" in data:
            user.full_name = data["full_name"]

        if "preferred_language" in data:
            user.preferred_language = data["preferred_language"]

        if "email" in data:
            # you can enforce verification step here if needed
            user.email = data["email"]

        user.save(update_fields=["full_name", "preferred_language", "email", "last_updated"])
        return Response(build_profile_payload(user), status=status.HTTP_200_OK)


# ============================
# ✅ 3) POST /profile/upload-photo/
# ============================

class ProfileUploadPhotoView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @transaction.atomic
    def post(self, request):
        user = request.user

        serializer = UploadPhotoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        photo = serializer.validated_data["photo"]

        # store in live_photo (your model uses this field)
        user.live_photo = photo
        user.save(update_fields=["live_photo", "last_updated"])

        return Response(
            {
                "success": True,
                "live_photo": user.live_photo.url if user.live_photo else None,
            },
            status=status.HTTP_200_OK,
        )



class ProfileRequestPhoneOtpView(APIView):
    """
    Creates OTP for: change phone / verify phone / etc.
    You can customize purpose if you want:
    purpose=VERIFY or RESET...
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request):
        user = request.user

        serializer = PhoneOtpRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone_number = serializer.validated_data["phone_number"]

        # Example: if requesting OTP to verify their *current* phone
        # You can also allow new phone flow here
        if phone_number != user.phone_number:
            return Response(
                {"detail": "Phone number mismatch. Use change phone flow."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ Generate OTP
        import random
        code = str(random.randint(100000, 999999))

        OTP.objects.create(
            identifier=phone_number,
            code=code,
            purpose="VERIFY",
            is_used=False,
        )

        # ✅ TODO: integrate SMS provider here
        # send_sms(phone_number, f"Your OTP code is {code}")

        return Response(
            {"success": True, "detail": "OTP sent successfully"},
            status=status.HTTP_200_OK,
        )


class PhoneOtpVerifySerializer(serializers.Serializer):
    phone_number = serializers.CharField()
    code = serializers.CharField(min_length=6, max_length=6)

    def validate_phone_number(self, value: str) -> str:
        v = (value or "").strip()
        if len(v) < 7:
            raise serializers.ValidationError("Invalid phone number")
        return v


class UsernameCheckSerializer(serializers.Serializer):
    username = serializers.CharField()

    def validate_username(self, value: str) -> str:
        # Let your model rules handle final validation,
        # but keep basic trimming here.
        return (value or "").strip()


class UsernameSetSerializer(serializers.Serializer):
    username = serializers.CharField()

    def validate_username(self, value: str) -> str:
        return (value or "").strip()


class PhoneChangeStartSerializer(serializers.Serializer):
    new_phone_number = serializers.CharField()

    def validate_new_phone_number(self, value: str) -> str:
        v = (value or "").strip()
        if len(v) < 7:
            raise serializers.ValidationError("Invalid phone number")
        return v

class ProfileVerifyPhoneOtpView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request):
        user = request.user

        serializer = PhoneOtpVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone_number = serializer.validated_data["phone_number"]
        code = serializer.validated_data["code"]

        if phone_number != user.phone_number:
            return Response(
                {"detail": "Phone number mismatch."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp = (
            OTP.objects.filter(
                identifier=phone_number,
                code=code,
                purpose="VERIFY",
                is_used=False,
            )
            .order_by("-created_at")
            .first()
        )

        if not otp:
            return Response(
                {"detail": "Invalid or expired OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp.is_expired():
            return Response(
                {"detail": "OTP expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ Mark used
        otp.is_used = True
        otp.save(update_fields=["is_used"])

        # ✅ Mark user verified (optional business rule)
        if not user.is_verified:
            user.is_verified = True
            user.save(update_fields=["is_verified", "last_updated"])

        return Response(
            {"success": True, "detail": "Phone verified successfully"},
            status=status.HTTP_200_OK,
        )


class ProfileCheckUsernameView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        username = (request.query_params.get("username") or "").strip()

        serializer = UsernameCheckSerializer(data={"username": username})
        serializer.is_valid(raise_exception=True)

        u = serializer.validated_data["username"]

        # ✅ quick empty check
        if not u:
            return Response(
                {"available": False, "detail": "Username is required"},
                status=status.HTTP_200_OK,
            )

        u_lower = u.lower()

        # ✅ Reserved usernames blocklist
        if ReservedUsername.objects.filter(username_lower=u_lower).exists():
            return Response(
                {"available": False, "detail": "Username is not allowed"},
                status=status.HTTP_200_OK,
            )

        # ✅ UsernameRegistry collision
        if UsernameRegistry.objects.filter(username_lower=u_lower).exists():
            return Response(
                {"available": False, "detail": "Username already taken"},
                status=status.HTTP_200_OK,
            )

        # ✅ User table collision (your User model has username unique=True)
        if User.objects.filter(username__iexact=u).exists():
            return Response(
                {"available": False, "detail": "Username already taken"},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"available": True, "detail": "Username is available"},
            status=status.HTTP_200_OK,
        )


# ============================
# ✅ 7) POST /profile/set-username/
# ============================

class ProfileSetUsernameView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @transaction.atomic
    def post(self, request):
        user = request.user

        serializer = UsernameSetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"].strip()
        username_lower = username.lower()

        # ✅ Reserved block
        if ReservedUsername.objects.filter(username_lower=username_lower).exists():
            return Response(
                {"detail": "Username is not allowed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ Registry collision
        if UsernameRegistry.objects.filter(username_lower=username_lower).exists():
            return Response(
                {"detail": "Username already taken"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ Users collision
        if User.objects.filter(username__iexact=username).exclude(id=user.id).exists():
            return Response(
                {"detail": "Username already taken"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ Update user's username
        user.username = username
        user.save(update_fields=["username", "last_updated"])

        # ✅ Create registry entry (public)
        UsernameRegistry.objects.create(
            username=username,
            entity_type="USER",
            tier="PUBLIC",
            status="ACTIVE",
            user=user,
            created_by=user,
            approved_by=user,
            note="Self-claimed username",
        )

        return Response(
            {
                "success": True,
                "detail": "Username updated successfully",
                "username": user.username,
            },
            status=status.HTTP_200_OK,
        )

class ProfileChangePhoneStartView(APIView):
    """
    Start phone change flow:
    - user enters new number
    - OTP is sent to NEW number
    - later you will verify OTP + swap phone
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @transaction.atomic
    def post(self, request):
        user = request.user

        serializer = PhoneChangeStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_phone = serializer.validated_data["new_phone_number"]

        if new_phone == user.phone_number:
            return Response(
                {"detail": "New phone number cannot be same as current"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ Ensure not taken by another account
        if User.objects.filter(phone_number=new_phone).exclude(id=user.id).exists():
            return Response(
                {"detail": "Phone number already in use"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ Generate OTP (for NEW phone)
        import random
        code = str(random.randint(100000, 999999))

        OTP.objects.create(
            identifier=new_phone,
            code=code,
            purpose="VERIFY",
            is_used=False,
        )

        # ✅ TODO: send SMS to new_phone
        # send_sms(new_phone, f"Your phone change OTP is {code}")

        return Response(
            {
                "success": True,
                "detail": "OTP sent to new phone number",
                "new_phone_number": new_phone,
            },
            status=status.HTTP_200_OK,
        )

from rest_framework import serializers



from accounts.models import ProfileSettings  # adjust import path


class ProfileDeviceSettingsView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @transaction.atomic
    def patch(self, request):
        user = request.user

        serializer = DeviceSettingsUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # ✅ ensure settings object exists
        settings_obj, _ = ProfileSettings.objects.get_or_create(user=user)

        user_fields_to_update = []
        settings_fields_to_update = []

        # -------------------------------
        # ✅ Update ProfileSettings toggles
        # -------------------------------
        for field in [
            "tracking_enabled",
            "location_enabled",
            "allow_location_sharing",
            "allow_push_notifications",
        ]:
            if field in data and hasattr(settings_obj, field):
                setattr(settings_obj, field, data[field])
                settings_fields_to_update.append(field)

        if settings_fields_to_update:
            settings_obj.save(update_fields=list(set(settings_fields_to_update + ["updated_at"])))

        # -------------------------------
        # ✅ Optional: Update device meta (on User)
        # -------------------------------
        for field in [
            "push_token",
            "platform",
            "app_version",
            "imei",
            "sim_number",
            "phone_model",
        ]:
            if field in data and hasattr(user, field):
                # empty string -> None
                v = data[field]
                setattr(user, field, v if v not in ["", None] else None)
                user_fields_to_update.append(field)

        # last seen is useful for audit
        if hasattr(user, "last_seen_at"):
            user.last_seen_at = timezone.now()
            user_fields_to_update.append("last_seen_at")

        if user_fields_to_update:
            user_fields_to_update.append("last_updated")
            user.save(update_fields=list(set(user_fields_to_update)))

        # ✅ return updated settings for frontend confidence
        return Response(
            {
                "success": True,
                "detail": "Device settings updated ✅",
                "settings": {
                    "tracking_enabled": settings_obj.tracking_enabled,
                    "location_enabled": settings_obj.location_enabled,
                    "allow_location_sharing": settings_obj.allow_location_sharing,
                    "allow_push_notifications": settings_obj.allow_push_notifications,
                },
            },
            status=status.HTTP_200_OK,
        )


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = [
            "id",
            "name",
            "phone",
            "relationship",
            "priority",
            "verified",
            "created_at",
        ]

class EmergencyContactCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=30)

    relationship = serializers.ChoiceField(
        choices=["FAMILY", "FRIEND", "NEIGHBOR", "COLLEAGUE", "OTHER"],
        required=False,
        allow_null=True,
    )

    priority = serializers.IntegerField(required=False, allow_null=True)


class ProfileEmergencyContactsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        qs = EmergencyContact.objects.filter(user=user).order_by("priority", "-created_at")
        data = EmergencyContactSerializer(qs, many=True).data

        return Response(
            {"results": data},
            status=status.HTTP_200_OK,
        )

class ProfileEmergencyContactsCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @transaction.atomic
    def post(self, request):
        user = request.user

        serializer = EmergencyContactCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # ✅ safety: limit number of contacts (avoid spam / abuse)
        if EmergencyContact.objects.filter(user=user).count() >= 10:
            return Response(
                {"detail": "You can only add up to 10 emergency contacts"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        contact = EmergencyContact.objects.create(
            user=user,
            name=data["name"].strip(),
            phone=data["phone"].strip(),
            relationship=data.get("relationship"),
            priority=data.get("priority"),
            verified=False,
        )

        return Response(
            EmergencyContactSerializer(contact).data,
            status=status.HTTP_201_CREATED,
        )


class ProfileEmergencyContactsDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def delete(self, request, id: str):
        user = request.user

        contact = EmergencyContact.objects.filter(id=id, user=user).first()
        if not contact:
            return Response(
                {"detail": "Emergency contact not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        contact.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)




class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = [
            "id",
            "name",
            "phone",
            "relationship",
            "priority",
            "verified",
            "created_at",
        ]


class EmergencyContactCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=30)

    relationship = serializers.ChoiceField(
        choices=["FAMILY", "FRIEND", "NEIGHBOR", "COLLEAGUE", "OTHER"],
        required=False,
        allow_null=True,
    )
    priority = serializers.IntegerField(required=False, allow_null=True)


class ProfileEmergencyContactsView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get(self, request):
        qs = EmergencyContact.objects.filter(user=request.user).order_by("priority", "-created_at")
        return Response({"results": EmergencyContactSerializer(qs, many=True).data})

    @transaction.atomic
    def post(self, request):
        user = request.user
        serializer = EmergencyContactCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if EmergencyContact.objects.filter(user=user).count() >= 10:
            return Response(
                {"detail": "You can only add up to 10 emergency contacts"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        contact = EmergencyContact.objects.create(
            user=user,
            name=data["name"].strip(),
            phone=data["phone"].strip(),
            relationship=data.get("relationship"),
            priority=data.get("priority"),
            verified=False,
        )

        return Response(EmergencyContactSerializer(contact).data, status=status.HTTP_201_CREATED)


class PrivacyUpdateSerializer(serializers.Serializer):
    allow_location_sharing = serializers.BooleanField(required=False)
    allow_anonymous_reports = serializers.BooleanField(required=False)
    allow_push_notifications = serializers.BooleanField(required=False)

    allow_messages_from = serializers.ChoiceField(
        choices=["EVERYONE", "CONTACTS_ONLY", "VERIFIED_ONLY"],
        required=False,
    )

    allow_device_binding = serializers.BooleanField(required=False)
    allow_media_upload = serializers.BooleanField(required=False)

    searchable_by_username = serializers.BooleanField(required=False)
    hide_last_seen = serializers.BooleanField(required=False)


class DeleteRequestSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)


# ============================
# ✅ 13) POST /profile/emergency-contacts/test-ping/
# ============================

class ProfileEmergencyTestPingView(APIView):
    """
    This is a test call (no real SMS yet)
    Production: integrate Twilio/Termii/Infobip
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request):
        user = request.user

        contacts_count = EmergencyContact.objects.filter(user=user).count()
        if contacts_count == 0:
            return Response(
                {"detail": "No emergency contacts found. Add at least one contact."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # TODO: send test ping in background (Celery)
        # For now just simulate success.
        return Response(
            {"success": True, "detail": "Emergency ping test triggered"},
            status=status.HTTP_200_OK,
        )


# ============================
# ✅ 14) POST /profile/privacy/
# ============================

class ProfilePrivacyUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @transaction.atomic
    def post(self, request):
        serializer = PrivacyUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        settings_obj, _ = ProfileSettings.objects.get_or_create(user=request.user)

        for field, value in serializer.validated_data.items():
            setattr(settings_obj, field, value)

        settings_obj.save()

        return Response(
            {"success": True, "detail": "Privacy settings updated"},
            status=status.HTTP_200_OK,
        )


# ============================
# ✅ 15) GET /profile/export/
# ============================

class ProfileExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        settings_obj = getattr(user, "profile_settings", None)

        payload = {
            "identity": {
                "id": str(user.id),
                "phone_number": user.phone_number,
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "preferred_language": user.preferred_language,
                "role": user.role,
                "is_verified": user.is_verified,
            },
            "settings": {
                "allow_location_sharing": getattr(settings_obj, "allow_location_sharing", None),
                "allow_anonymous_reports": getattr(settings_obj, "allow_anonymous_reports", None),
                "allow_push_notifications": getattr(settings_obj, "allow_push_notifications", None),
                "allow_messages_from": getattr(settings_obj, "allow_messages_from", None),
                "allow_device_binding": getattr(settings_obj, "allow_device_binding", None),
                "allow_media_upload": getattr(settings_obj, "allow_media_upload", None),
                "searchable_by_username": getattr(settings_obj, "searchable_by_username", None),
                "hide_last_seen": getattr(settings_obj, "hide_last_seen", None),
            },
            "emergency_contacts": [
                {
                    "id": str(c.id),
                    "name": c.name,
                    "phone": c.phone,
                    "relationship": c.relationship,
                    "priority": c.priority,
                    "verified": c.verified,
                    "created_at": c.created_at,
                }
                for c in EmergencyContact.objects.filter(user=user)
            ],
            "audit": {
                "date_joined": user.date_joined,
                "last_updated": user.last_updated,
            },
        }

        return Response(payload, status=status.HTTP_200_OK)


# ============================
# ✅ 16) POST /profile/delete-request/
# ============================

class ProfileDeleteRequestView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @transaction.atomic
    def post(self, request):
        serializer = DeleteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reason = serializer.validated_data.get("reason", "").strip()

        # prevent duplicates
        existing = AccountDeletionRequest.objects.filter(
            user=request.user,
            status="PENDING",
        ).order_by("-created_at").first()

        if existing:
            return Response(
                {"detail": "You already have a pending deletion request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        AccountDeletionRequest.objects.create(
            user=request.user,
            reason=reason,
            status="PENDING",
        )

        return Response(
            {"success": True, "detail": "Deletion request submitted"},
            status=status.HTTP_201_CREATED,
        )


from accounts.models import ProfileSettings




TIME_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")  # HH:MM


class ProfileSettingsUpdateSerializer(serializers.Serializer):
    emergency_mode_enabled = serializers.BooleanField(required=False)

    tracking_enabled = serializers.BooleanField(required=False)
    location_enabled = serializers.BooleanField(required=False)

    allow_location_sharing = serializers.BooleanField(required=False)
    allow_anonymous_reports = serializers.BooleanField(required=False)
    allow_push_notifications = serializers.BooleanField(required=False)

    allow_messages_from = serializers.ChoiceField(
        choices=["EVERYONE", "CONTACTS_ONLY", "VERIFIED_ONLY"],
        required=False,
    )

    allow_device_binding = serializers.BooleanField(required=False)
    allow_media_upload = serializers.BooleanField(required=False)

    searchable_by_username = serializers.BooleanField(required=False)
    hide_last_seen = serializers.BooleanField(required=False)

    sos_silent_mode = serializers.BooleanField(required=False)
    sos_countdown_seconds = serializers.IntegerField(required=False, min_value=0, max_value=60)

    sos_auto_call_enabled = serializers.BooleanField(required=False)
    sos_auto_share_location = serializers.BooleanField(required=False)
    sos_auto_record_audio = serializers.BooleanField(required=False)

    quiet_hours_enabled = serializers.BooleanField(required=False)
    quiet_hours_start = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    quiet_hours_end = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    def validate(self, attrs):
        start = attrs.get("quiet_hours_start", None)
        end = attrs.get("quiet_hours_end", None)

        # only validate format if supplied
        if start not in [None, ""] and not TIME_RE.match(start):
            raise serializers.ValidationError({"quiet_hours_start": "Invalid time format. Use HH:MM"})

        if end not in [None, ""] and not TIME_RE.match(end):
            raise serializers.ValidationError({"quiet_hours_end": "Invalid time format. Use HH:MM"})

        return attrs


class ProfileSettingsView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @transaction.atomic
    def patch(self, request):
        serializer = ProfileSettingsUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        settings_obj, _ = ProfileSettings.objects.get_or_create(user=request.user)

        for field, value in serializer.validated_data.items():
            # normalize empty strings -> null for quiet hours fields
            if field in ["quiet_hours_start", "quiet_hours_end"] and value == "":
                value = None
            setattr(settings_obj, field, value)

        settings_obj.save()

        return Response(
            {"success": True, "detail": "Settings updated successfully"},
            status=status.HTTP_200_OK,
        )

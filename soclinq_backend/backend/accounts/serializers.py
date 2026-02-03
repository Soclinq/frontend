from rest_framework import serializers
from .models import Organization, User
from .errors import SingleErrorValidationError


class RegisterSubmitSerializer(serializers.Serializer):
    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)
    otp = serializers.CharField()
    role = serializers.ChoiceField(choices=["USER", "ORG"])
    fullName = serializers.CharField()

    orgName = serializers.CharField(required=False, allow_blank=True)
    orgType = serializers.CharField(required=False, allow_blank=True)
    orgTypeOther = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)

    documents = serializers.ListField(
        child=serializers.FileField(),
        required=False
    )

    # ---------- FIELD LEVEL ----------
    def validate(self, attrs):
        email = attrs.get("email")
        phone = attrs.get("phone")
        role = attrs.get("role")

        if email and User.objects.filter(email__iexact=email).exists():
            raise SingleErrorValidationError(
                "This email is already registered."
            )

        if phone and User.objects.filter(phone_number=phone).exists():
            raise SingleErrorValidationError(
                "This phone number is already registered."
            )

        # ORG rules
        if role == "ORG":
            documents = attrs.get("documents") or []
            if len(documents) < 1:
                raise SingleErrorValidationError(
                    "At least one verification document is required."
                )

            if not attrs.get("orgName"):
                raise SingleErrorValidationError(
                    "Organization name is required."
                )

            if not attrs.get("orgType"):
                raise SingleErrorValidationError(
                    "Organization type is required."
                )

            if not attrs.get("address"):
                raise SingleErrorValidationError(
                    "Organization address is required."
                )

            if Organization.objects.filter(
                name__iexact=attrs.get("orgName"),
                org_type=attrs.get("orgType"),
                address__iexact=attrs.get("address"),
            ).exists():
                raise SingleErrorValidationError(
                    "An organization with the same name, type, and address already exists."
                )

        return attrs

from rest_framework import serializers


class DeviceSettingsUpdateSerializer(serializers.Serializer):
    # ✅ settings toggles (snake_case)
    tracking_enabled = serializers.BooleanField(required=False)
    location_enabled = serializers.BooleanField(required=False)

    allow_location_sharing = serializers.BooleanField(required=False)
    allow_push_notifications = serializers.BooleanField(required=False)

    # ✅ optional: device meta
    push_token = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    platform = serializers.ChoiceField(
        choices=["WEB", "ANDROID", "IOS"],
        required=False,
        allow_null=True,
    )
    app_version = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    imei = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    sim_number = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    phone_model = serializers.CharField(required=False, allow_null=True, allow_blank=True)

from .rbac import ROLE_PERMISSIONS
from django.contrib.gis.geos import Point
from django.utils import timezone
from community.services import LocationResolver
from datetime import timedelta


def has_permission(user, permission):
    if not user.is_authenticated:
        return False

    role_perms = ROLE_PERMISSIONS.get(user.role, set())

    if "*" in role_perms:
        return True

    return permission in role_perms



SOURCE_PRIORITY = {
    "GPS": 3,
    "IP": 2,
    "UNKNOWN": 1,
}

IP_UPDATE_THROTTLE_MINUTES = 5


def update_user_location(user, lat, lng, source="UNKNOWN"):
    """
    Update user's location with source priority + throttling.
    GPS always overrides IP. IP updates are throttled.
    """
    if lat is None or lng is None:
        return

    source = source.upper()
    new_priority = SOURCE_PRIORITY.get(source, 1)
    old_priority = SOURCE_PRIORITY.get(user.location_source, 1)

    now = timezone.now()

    # ⏱️ Throttle IP updates
    if source == "IP" and user.location_updated_at:
        if now - user.location_updated_at < timedelta(minutes=IP_UPDATE_THROTTLE_MINUTES):
            return

    # ❌ Ignore lower-priority updates
    if user.last_known_location and new_priority < old_priority:
        return

    point = Point(float(lng), float(lat), srid=4326)

    resolver = LocationResolver(
        lat=float(lat),
        lng=float(lng),
        country_code=None,
    )

    admin_units, confidence = resolver.resolve()

    user.last_known_location = point
    user.location_source = source
    user.location_confidence = confidence
    user.location_updated_at = now

    user.admin_0 = admin_units.get(0)
    user.admin_1 = admin_units.get(1)
    user.admin_2 = admin_units.get(2)

    user.save(update_fields=[
        "last_known_location",
        "location_source",
        "location_confidence",
        "location_updated_at",
        "admin_0",
        "admin_1",
        "admin_2",
    ])


import requests

def get_ip_location(ip_address):
    """
    Resolve IP to approximate lat/lng.
    Keep this lightweight and replaceable.
    """
    if not ip_address:
        return None

    try:
        # Example using ipapi.co (replace later if needed)
        resp = requests.get(
            f"https://ipapi.co/{ip_address}/json/",
            timeout=2,
        )
        data = resp.json()

        lat = data.get("latitude")
        lng = data.get("longitude")

        if lat is None or lng is None:
            return None

        return {
            "lat": lat,
            "lng": lng,
            "source": "IP",
        }
    except Exception:
        return None


import re

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,32}$")

def normalize_username(username: str) -> str:
    return (username or "").strip()

def validate_username_format(username: str):
    if not username:
        return "Username is required"

    if not USERNAME_RE.match(username):
        return "Username must be 3-32 characters and contain only letters, numbers, underscore"

    if username.startswith("_") or username.endswith("_"):
        return "Username cannot start or end with underscore"

    if "__" in username:
        return "Username cannot contain consecutive underscores"

    return None

from rest_framework import serializers
from .models import User

class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "phone_number",
            "username",
            "full_name",
            "role",
            "preferred_language",
            "live_photo",
            "is_active",
            "is_suspended",
            "failed_login_attempts",
            "lock_until",
            "is_staff",
            "is_verified",
            "date_joined",
            "last_updated",
        ]




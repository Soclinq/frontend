# community/serializers.py
from rest_framework import serializers
from community.models import CommunityHub


class HubSerializer(serializers.ModelSerializer):
    # ✅ we override hub_type -> type to match frontend
    type = serializers.CharField(source="hub_type")

    class Meta:
        model = CommunityHub
        fields = [
            "id",
            "name",
            "type",

            # identity
            "description",
            "category",
            "tags",
            "cover_image",
            "avatar_icon",
            "location_label",
            "created_at",
            "updated_at",

            # status
            "is_default",
            "is_verified",
            "is_active",

            # privacy
            "privacy",
            "join_mode",
            "is_locked",
            "requires_location_match",
            "min_age",

            # moderation
            "rules",
            "report_count",
            "auto_moderation_enabled",
            "banned_words",
            "allow_media",
            "allow_links",
            "slow_mode_seconds",
            "max_members",

            # ownership
            "created_by",
            "verified_by",

            # monetization
            "is_sponsored",
            "sponsor_name",
            "donation_enabled",
            "subscription_enabled",
            "ad_slots_enabled",
        ]


class HubComputedSerializer(serializers.Serializer):
    """Extra computed fields added per-user"""
    user_joined = serializers.BooleanField()
    user_role = serializers.CharField(allow_null=True)
    members_count = serializers.IntegerField()
    online_count = serializers.IntegerField()
    unread_count = serializers.IntegerField()

    last_message_text = serializers.CharField(allow_null=True)
    last_message_type = serializers.CharField(allow_null=True)
    last_message_at = serializers.CharField(allow_null=True)
    last_message_sender_name = serializers.CharField(allow_null=True)

    pinned_message_id = serializers.CharField(allow_null=True)



class PrivateInboxItemSerializer(serializers.Serializer):
    conversation_id = serializers.UUIDField()

    other_user = serializers.DictField()

    last_message_text = serializers.CharField(allow_null=True, required=False)
    last_message_at = serializers.DateTimeField(allow_null=True, required=False)

    unread_count = serializers.IntegerField(min_value=0)

from rest_framework import serializers
from .models import LiveStream

class LiveStreamSerializer(serializers.ModelSerializer):
    distanceKm = serializers.FloatField(read_only=True)

    class Meta:
        model = LiveStream
        fields = [
            "id",
            "title",
            "description",
            "stream_url",
            "thumbnail",
            "distanceKm",
            "started_at",
            "ended_at",
            "is_live",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["streamUrl"] = data.pop("stream_url")
        data["isLive"] = data.pop("is_live")
        data["startedAt"] = data.pop("started_at")
        data["endedAt"] = data.pop("ended_at")
        return data

from django.db import models
from django.conf import settings

class LiveStream(models.Model):
    STATUS_CHOICES = (
        ("LIVE", "Live"),
        ("ENDED", "Ended"),
        ("FAILED", "Failed"),
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="live_streams",
    )

    room = models.CharField(max_length=100, unique=True)

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    latitude = models.FloatField()
    longitude = models.FloatField()

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="LIVE",
    )

    sos = models.OneToOneField(
        "sos.SOSAlert",
        on_delete=models.CASCADE,
        related_name="stream",
        null=True,
        blank=True,
    )

    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    # Cached values for fast queries
    current_severity_score = models.IntegerField(default=0)
    current_severity_level = models.CharField(max_length=20, default="LOW")

    def __str__(self):
        return f"{self.room} ({self.status})"


class StreamRecording(models.Model):
    stream = models.ForeignKey(
        LiveStream,
        on_delete=models.CASCADE,
        related_name="recordings",
    )

    provider = models.CharField(max_length=50)  # livekit
    recording_url = models.URLField()

    started_at = models.DateTimeField()
    ended_at = models.DateTimeField()

    duration_seconds = models.IntegerField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Recording for {self.stream.room}"


class StreamSeverityLog(models.Model):
    stream = models.ForeignKey(
        LiveStream,
        on_delete=models.CASCADE,
        related_name="severity_logs",
    )

    score = models.IntegerField()
    level = models.CharField(max_length=20)

    source = models.CharField(
        max_length=50,
        default="AI_CLIENT",
    )

    created_at = models.DateTimeField(auto_now_add=True)

class StreamResponder(models.Model):
    stream = models.ForeignKey(
        LiveStream,
        on_delete=models.CASCADE,
        related_name="responders",
    )

    responder = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assigned_streams",
    )

    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)

    acknowledged = models.BooleanField(default=False)

    role = models.CharField(
        max_length=50,
        default="RESPONDER",
    )

class StreamActivity(models.Model):
    ACTIVITY_CHOICES = (
        ("STARTED", "Stream Started"),
        ("ENDED", "Stream Ended"),
        ("RESPONDER_JOINED", "Responder Joined"),
        ("RESPONDER_LEFT", "Responder Left"),
        ("SEVERITY_UPDATE", "Severity Update"),
        ("RECORDING_READY", "Recording Ready"),
        ("NETWORK_LOST", "Network Lost"),
    )

    stream = models.ForeignKey(
        LiveStream,
        on_delete=models.CASCADE,
        related_name="activities",
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    type = models.CharField(max_length=50, choices=ACTIVITY_CHOICES)

    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

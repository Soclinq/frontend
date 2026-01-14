import uuid
from django.db import models
from django.conf import settings
from django.contrib.gis.db import models as gis_models

User = settings.AUTH_USER_MODEL


class Device(models.Model):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("MISSING", "Missing"),
        ("RECOVERED", "Recovered"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="devices"
    )

    imei = models.CharField(max_length=20, unique=True)
    phone_model = models.CharField(max_length=100)
    sim_number = models.CharField(max_length=20, blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="ACTIVE"
    )

    is_soft_target = models.BooleanField(default=False)  # child, elder, journalist

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.phone_model} ({self.imei})"


class DeviceLocation(models.Model):
    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name="locations"
    )

    location = gis_models.PointField(geography=True)
    speed = models.FloatField(null=True, blank=True)  # km/h
    heading = models.FloatField(null=True, blank=True)

    source = models.CharField(
        max_length=30,
        default="APP"
    )  # APP / SMS / CARRIER

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

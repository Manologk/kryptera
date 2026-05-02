from django.conf import settings
from django.db import models


class Recipient(models.Model):
    """Contact belonging to a sender — not a login account."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recipients",
    )
    full_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=50, blank=True)
    delivery_method = models.CharField(max_length=48, blank=True)
    delivery_details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner"]),
        ]

    def __str__(self):
        return self.full_name or str(self.pk)

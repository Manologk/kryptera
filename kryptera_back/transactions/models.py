"""
transactions/models.py
"""
import uuid
from django.db import models
from users.models import User


class ConversionMode(models.TextChoices):
    RUSSIA_ZAMBIA = "russia-zambia", "Russia → Zambia"
    ZAMBIA_RUSSIA = "zambia-russia", "Zambia → Russia"


class TransactionStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    AWAITING_CONFIRMATION = "awaiting_confirmation", "Awaiting confirmation"
    POP_NOT_UPLOADED = "pop_not_uploaded", "Awaiting POP"
    PENDING_VERIFICATION = "pending_verification", "Pending Verification"
    COMPLETED = "completed", "Completed"
    REJECTED = "rejected", "Rejected"


class Currency(models.TextChoices):
    RUB = "RUB", "Russian Ruble"
    ZMW = "ZMW", "Zambian Kwacha"
    USD = "USD", "US Dollar"


def pop_upload_path(instance, filename):
    return f"pop/{instance.id}/{filename}"


def receipt_upload_path(instance, filename):
    return f"receipts/{instance.id}/{filename}"


class Transaction(models.Model):
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user            = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="transactions")
    mode            = models.CharField(max_length=20, choices=ConversionMode.choices)
    input_amount    = models.DecimalField(max_digits=18, decimal_places=6)
    input_currency  = models.CharField(max_length=3, choices=Currency.choices)
    result_amount   = models.DecimalField(max_digits=18, decimal_places=6)
    result_currency = models.CharField(max_length=3, choices=Currency.choices)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=4, default="0.0450")
    purpose         = models.CharField(max_length=500, blank=True)
    delivery_method = models.CharField(max_length=48, blank=True)
    payment_method  = models.CharField(max_length=48, blank=True)
    status          = models.CharField(
        max_length=30, choices=TransactionStatus.choices,
        default=TransactionStatus.PENDING,
    )
    pop_file    = models.FileField(upload_to=pop_upload_path, null=True, blank=True)
    receipt_file = models.FileField(upload_to=receipt_upload_path, null=True, blank=True)
    delivery_proof = models.FileField(upload_to="delivery_proofs/", null=True, blank=True)
    admin_note  = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True, help_text="Optional notes shown to the client with delivery proof.")
    receipt_confirmed = models.BooleanField(default=False)
    receipt_confirmed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    recipient = models.ForeignKey(
        "recipients.Recipient",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="transactions",
    )
    recipient_snapshot = models.JSONField(null=True, blank=True)
    rate_snapshot = models.JSONField(default=dict, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes  = [
            models.Index(fields=["user"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.mode} | {self.input_amount} {self.input_currency} → {self.result_amount} {self.result_currency} [{self.status}]"

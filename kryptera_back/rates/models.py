"""
rates/models — Currencies, quote rows, singleton exchange rate (legacy + sync), audit logs.
"""
from decimal import Decimal

from django.db import models
from django.utils import timezone
from users.models import User


class PlatformSettings(models.Model):
    """Singleton (pk=1) — global commission rate and other platform knobs."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    commission_rate = models.DecimalField(max_digits=7, decimal_places=6, default=Decimal("0.045000"))
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Platform settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    def __str__(self):
        return f"Platform settings (commission={self.commission_rate})"


class PaymentReceivingConfig(models.Model):
    """Per-corridor payment method: show details on-site or request via WhatsApp."""

    class DisplayMode(models.TextChoices):
        WHATSAPP = "whatsapp", "Request via WhatsApp"
        INLINE = "inline", "Show on site"

    corridor = models.CharField(max_length=20, db_index=True)
    payment_method = models.CharField(max_length=48, db_index=True)
    display_mode = models.CharField(
        max_length=20,
        choices=DisplayMode.choices,
        default=DisplayMode.WHATSAPP,
    )
    details = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["corridor", "payment_method"]
        constraints = [
            models.UniqueConstraint(
                fields=["corridor", "payment_method"],
                name="rates_paymentreceivingconfig_corridor_method_uniq",
            ),
        ]
        verbose_name = "Payment receiving config"
        verbose_name_plural = "Payment receiving configs"

    def __str__(self):
        return f"{self.corridor} / {self.payment_method} ({self.display_mode})"


class Currency(models.Model):
    """Enabled currencies for UI and validation (codes align with Transaction currency choices)."""

    code = models.CharField(max_length=3, unique=True, db_index=True)
    name = models.CharField(max_length=128)
    symbol = models.CharField(max_length=8, blank=True)
    flag_emoji = models.CharField(max_length=16, blank=True)
    is_enabled = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "code"]
        verbose_name = "Currency"
        verbose_name_plural = "Currencies"

    def __str__(self):
        return f"{self.code} — {self.name}"


class ExchangeRateQuote(models.Model):
    """One row per rate slug; active rows feed effective_rates() and ExchangeRate.load()."""

    slug = models.SlugField(max_length=32, unique=True, db_index=True)
    rate = models.DecimalField(max_digits=18, decimal_places=6, default=0)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="quote_updates",
    )

    class Meta:
        ordering = ["slug"]

    def __str__(self):
        return f"{self.slug}={self.rate}"


class RateQuoteAuditLog(models.Model):
    """Immutable log of individual quote changes."""

    changed_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    slug = models.SlugField(max_length=32, db_index=True)
    old_rate = models.DecimalField(max_digits=18, decimal_places=6)
    new_rate = models.DecimalField(max_digits=18, decimal_places=6)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ExchangeRate(models.Model):
    """Singleton row — id=1; kept in sync with quotes for admin / legacy reads."""
    ruble_to_usd_buying = models.DecimalField(max_digits=18, decimal_places=6, default=0)
    usd_to_kwacha_selling = models.DecimalField(max_digits=18, decimal_places=6, default=0)
    kwacha_to_usd_buying = models.DecimalField(max_digits=18, decimal_places=6, default=0)
    usd_to_ruble_selling = models.DecimalField(max_digits=18, decimal_places=6, default=0)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="rate_updates"
    )

    class Meta:
        verbose_name = "Exchange Rate"

    def __str__(self):
        return f"Exchange Rates (updated {self.updated_at:%Y-%m-%d %H:%M})"

    @classmethod
    def load(cls) -> "ExchangeRate":
        """Adapter: build an in-memory instance from active quotes (fallback: DB singleton)."""
        from .services import effective_rates

        d = effective_rates()
        inst = cls()
        inst.pk = 1
        inst.ruble_to_usd_buying = d["ruble_to_usd_buying"]
        inst.usd_to_kwacha_selling = d["usd_to_kwacha_selling"]
        inst.kwacha_to_usd_buying = d["kwacha_to_usd_buying"]
        inst.usd_to_ruble_selling = d["usd_to_ruble_selling"]
        at = d.get("updated_at")
        inst.updated_at = at if at is not None else timezone.now()
        return inst

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass


class RateAuditLog(models.Model):
    """Immutable log of full four-rate snapshots (legacy + bulk admin updates)."""
    changed_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    ruble_to_usd_buying = models.DecimalField(max_digits=18, decimal_places=6)
    usd_to_kwacha_selling = models.DecimalField(max_digits=18, decimal_places=6)
    kwacha_to_usd_buying = models.DecimalField(max_digits=18, decimal_places=6)
    usd_to_ruble_selling = models.DecimalField(max_digits=18, decimal_places=6)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Rate Audit Log"
        verbose_name_plural = "Rate Audit Logs"

    def __str__(self):
        return f"Rate change at {self.created_at:%Y-%m-%d %H:%M} by {self.changed_by}"

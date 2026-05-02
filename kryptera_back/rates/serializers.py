import re

from rest_framework import serializers

from .models import Currency, ExchangeRate, ExchangeRateQuote, RateAuditLog, RateQuoteAuditLog

_SLUG_RE = re.compile(r"^[a-z0-9_]{2,32}$")


class ExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRate
        fields = [
            "ruble_to_usd_buying",
            "usd_to_kwacha_selling",
            "kwacha_to_usd_buying",
            "usd_to_ruble_selling",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def validate(self, data):
        for field in [
            "ruble_to_usd_buying",
            "usd_to_kwacha_selling",
            "kwacha_to_usd_buying",
            "usd_to_ruble_selling",
        ]:
            value = data.get(field)
            if value is not None and value <= 0:
                raise serializers.ValidationError({field: "Must be a positive number."})
        return data


class RateAuditLogSerializer(serializers.ModelSerializer):
    changed_by_email = serializers.EmailField(source="changed_by.email", read_only=True)

    class Meta:
        model = RateAuditLog
        fields = [
            "id",
            "changed_by_email",
            "ruble_to_usd_buying",
            "usd_to_kwacha_selling",
            "kwacha_to_usd_buying",
            "usd_to_ruble_selling",
            "created_at",
        ]


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = [
            "id",
            "code",
            "name",
            "symbol",
            "flag_emoji",
            "is_enabled",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ExchangeRateQuoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRateQuote
        fields = ["id", "slug", "rate", "is_active", "updated_at", "updated_by"]
        read_only_fields = ["id", "slug", "updated_at", "updated_by"]


class ExchangeRateQuoteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRateQuote
        fields = ["slug", "rate", "is_active"]

    def validate_slug(self, value):
        if not _SLUG_RE.match(value):
            raise serializers.ValidationError(
                "Slug must be 2–32 chars: lowercase letters, digits, underscores only."
            )
        if ExchangeRateQuote.objects.filter(slug=value).exists():
            raise serializers.ValidationError("A quote with this slug already exists.")
        return value

    def validate_rate(self, value):
        if value <= 0:
            raise serializers.ValidationError("Rate must be positive.")
        return value


class RateQuoteAuditLogSerializer(serializers.ModelSerializer):
    changed_by_email = serializers.EmailField(source="changed_by.email", read_only=True)

    class Meta:
        model = RateQuoteAuditLog
        fields = ["id", "slug", "old_rate", "new_rate", "changed_by_email", "created_at"]


class PlatformCommissionSerializer(serializers.Serializer):
    """PATCH body for admin commission update."""

    commission_rate = serializers.DecimalField(max_digits=7, decimal_places=6)

    def validate_commission_rate(self, value):
        from decimal import Decimal

        if value <= Decimal("0"):
            raise serializers.ValidationError("Commission must be greater than zero.")
        if value >= Decimal("1"):
            raise serializers.ValidationError("Commission must be less than 100%.")
        return value

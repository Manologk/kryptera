"""
transactions/serializers.py
"""
from decimal import Decimal, InvalidOperation

from rest_framework import serializers

from rates.models import ExchangeRate
from recipients.models import Recipient
from recipients.serializers import RecipientThinSerializer

from .models import Transaction, TransactionStatus

COMMISSION_RATE = Decimal("0.0450")


def calculate_conversion(
    mode: str,
    input_amount: Decimal,
    rates: ExchangeRate,
    *,
    commission_on_top: bool = False,
    commission_rate: Decimal = COMMISSION_RATE,
) -> Decimal:
    """Pure conversion logic — mirrors the React hook.

    If commission_on_top is False (default), commission is taken *from* input_amount.
    If True, input_amount is the full principal that converts; commission is charged on top.
    """
    if commission_on_top:
        after_commission = input_amount
    else:
        after_commission = input_amount * (1 - commission_rate)
    if mode == "russia-zambia":
        usd = after_commission / rates.ruble_to_usd_buying
        return usd * rates.usd_to_kwacha_selling
    usd = after_commission / rates.kwacha_to_usd_buying
    return usd * rates.usd_to_ruble_selling


def _rates_from_snapshot(snap: dict) -> ExchangeRate | None:
    if not snap:
        return None
    try:
        r = ExchangeRate()
        r.ruble_to_usd_buying = Decimal(str(snap["ruble_to_usd_buying"]))
        r.usd_to_kwacha_selling = Decimal(str(snap["usd_to_kwacha_selling"]))
        r.kwacha_to_usd_buying = Decimal(str(snap["kwacha_to_usd_buying"]))
        r.usd_to_ruble_selling = Decimal(str(snap["usd_to_ruble_selling"]))
        return r
    except (KeyError, InvalidOperation):
        return None


def _commission_on_top_from_snap(snap: dict) -> bool:
    v = snap.get("commission_on_top", False)
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return v.strip().lower() in ("true", "1", "yes")
    return bool(v)


def build_conversion_breakdown(
    mode: str,
    input_amount: Decimal,
    rates: ExchangeRate,
    commission_rate: Decimal,
    *,
    commission_on_top: bool = False,
) -> dict:
    commission_amount = input_amount * commission_rate
    if commission_on_top:
        after_commission = input_amount
    else:
        after_commission = input_amount * (1 - commission_rate)
    if mode == "russia-zambia":
        usd = after_commission / rates.ruble_to_usd_buying
        final = usd * rates.usd_to_kwacha_selling
        return {
            "input": str(input_amount),
            "input_currency": "RUB",
            "commission_rate": str(commission_rate),
            "commission_amount": str(commission_amount),
            "after_commission": str(after_commission),
            "usd": str(usd),
            "final": str(final),
            "output_currency": "ZMW",
        }
    usd = after_commission / rates.kwacha_to_usd_buying
    final = usd * rates.usd_to_ruble_selling
    return {
        "input": str(input_amount),
        "input_currency": "ZMW",
        "commission_rate": str(commission_rate),
        "commission_amount": str(commission_amount),
        "after_commission": str(after_commission),
        "usd": str(usd),
        "final": str(final),
        "output_currency": "RUB",
    }


class TransactionSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    recipient_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    commission_on_top = serializers.BooleanField(required=False, default=False, write_only=True)
    recipient = RecipientThinSerializer(read_only=True)
    conversion_breakdown = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            "id",
            "user_email",
            "mode",
            "input_amount",
            "commission_on_top",
            "input_currency",
            "result_amount",
            "result_currency",
            "commission_rate",
            "purpose",
            "status",
            "pop_file",
            "receipt_file",
            "admin_note",
            "recipient_id",
            "recipient",
            "recipient_snapshot",
            "rate_snapshot",
            "conversion_breakdown",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user_email",
            "input_currency",
            "result_amount",
            "result_currency",
            "commission_rate",
            "status",
            "pop_file",
            "receipt_file",
            "admin_note",
            "recipient",
            "recipient_snapshot",
            "rate_snapshot",
            "conversion_breakdown",
            "created_at",
            "updated_at",
        ]

    def get_conversion_breakdown(self, obj: Transaction):
        snap = obj.rate_snapshot or {}
        rates = _rates_from_snapshot(snap)
        if rates is None:
            return None
        try:
            cr = Decimal(str(snap.get("commission_rate", COMMISSION_RATE)))
        except InvalidOperation:
            cr = COMMISSION_RATE
        return build_conversion_breakdown(
            obj.mode,
            obj.input_amount,
            rates,
            cr,
            commission_on_top=_commission_on_top_from_snap(snap),
        )

    def validate_input_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value

    def validate(self, data):
        mode = data.get("mode")
        if mode not in ("russia-zambia", "zambia-russia"):
            raise serializers.ValidationError({"mode": "Invalid mode."})

        input_currency = "RUB" if mode == "russia-zambia" else "ZMW"
        result_currency = "ZMW" if mode == "russia-zambia" else "RUB"
        data["input_currency"] = input_currency
        data["result_currency"] = result_currency

        rates = ExchangeRate.load()
        if rates.ruble_to_usd_buying == 0:
            raise serializers.ValidationError("Exchange rates have not been configured.")

        commission_on_top = bool(data.pop("commission_on_top", False))
        data["result_amount"] = calculate_conversion(
            mode, data["input_amount"], rates, commission_on_top=commission_on_top
        )
        data["commission_rate"] = COMMISSION_RATE

        rid = data.pop("recipient_id", None)
        if rid is not None:
            user = self.context["request"].user
            try:
                rec = Recipient.objects.get(pk=rid, user=user, is_active=True)
            except Recipient.DoesNotExist:
                raise serializers.ValidationError({"recipient_id": "Invalid recipient."})
            data["recipient"] = rec
            data["recipient_snapshot"] = {
                "label": rec.label,
                "full_name": rec.full_name,
                "email": rec.email,
                "phone": rec.phone,
            }

        from rates.services import snapshot_rates_dict

        snap = snapshot_rates_dict()
        snap["commission_rate"] = str(COMMISSION_RATE)
        snap["commission_on_top"] = commission_on_top
        data["rate_snapshot"] = snap

        return data


class PopUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ["id", "pop_file", "status"]
        read_only_fields = ["id", "status"]

    def validate_pop_file(self, value):
        max_mb = 10
        if value.size > max_mb * 1024 * 1024:
            raise serializers.ValidationError(f"File too large. Maximum size is {max_mb}MB.")
        allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
        if value.content_type not in allowed:
            raise serializers.ValidationError("Only JPEG, PNG, WEBP, or PDF files are accepted.")
        return value

    def update(self, instance, validated_data):
        instance.pop_file = validated_data["pop_file"]
        instance.status = TransactionStatus.PENDING_VERIFICATION
        instance.save()
        return instance


class AdminTransactionSerializer(serializers.ModelSerializer):
    """Wider serializer for admin use — allows status and note updates."""
    user_email = serializers.EmailField(source="user.email", read_only=True)
    recipient = RecipientThinSerializer(read_only=True)
    conversion_breakdown = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            "id",
            "user_email",
            "mode",
            "input_amount",
            "input_currency",
            "result_amount",
            "result_currency",
            "commission_rate",
            "purpose",
            "status",
            "pop_file",
            "receipt_file",
            "admin_note",
            "recipient",
            "recipient_snapshot",
            "rate_snapshot",
            "conversion_breakdown",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user_email",
            "mode",
            "input_amount",
            "input_currency",
            "result_amount",
            "result_currency",
            "commission_rate",
            "purpose",
            "recipient",
            "recipient_snapshot",
            "rate_snapshot",
            "conversion_breakdown",
            "created_at",
        ]

    def get_conversion_breakdown(self, obj: Transaction):
        snap = obj.rate_snapshot or {}
        rates = _rates_from_snapshot(snap)
        if rates is None:
            return None
        try:
            cr = Decimal(str(snap.get("commission_rate", COMMISSION_RATE)))
        except InvalidOperation:
            cr = COMMISSION_RATE
        return build_conversion_breakdown(
            obj.mode,
            obj.input_amount,
            rates,
            cr,
            commission_on_top=_commission_on_top_from_snap(snap),
        )

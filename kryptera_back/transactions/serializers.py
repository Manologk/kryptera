"""
transactions/serializers.py
"""
from decimal import Decimal, InvalidOperation

from django.utils import timezone
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
    recipient_full_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    recipient_email = serializers.CharField(write_only=True, required=False, allow_blank=True)
    recipient_phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    recipient_delivery_method = serializers.CharField(write_only=True, required=False, allow_blank=True)
    recipient_delivery_details = serializers.JSONField(write_only=True, required=False, allow_null=True)
    recipient = RecipientThinSerializer(read_only=True)
    conversion_breakdown = serializers.SerializerMethodField()
    delivery_proof = serializers.SerializerMethodField()
    delivery_notes = serializers.SerializerMethodField()

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
            "delivery_method",
            "payment_method",
            "status",
            "pop_file",
            "delivery_proof",
            "delivery_notes",
            "completed_at",
            "recipient_id",
            "recipient_full_name",
            "recipient_email",
            "recipient_phone",
            "recipient_delivery_method",
            "recipient_delivery_details",
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
            "delivery_proof",
            "delivery_notes",
            "completed_at",
            "recipient",
            "recipient_snapshot",
            "rate_snapshot",
            "conversion_breakdown",
            "created_at",
            "updated_at",
        ]

    def get_delivery_proof(self, obj: Transaction):
        f = obj.delivery_proof or obj.receipt_file
        if not f:
            return None
        return f.name

    def get_delivery_notes(self, obj: Transaction):
        if obj.status != TransactionStatus.COMPLETED:
            return None
        notes = (obj.admin_notes or "").strip()
        return notes or None

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
        recipient_full_name = (data.pop("recipient_full_name", None) or "").strip()
        recipient_email = (data.pop("recipient_email", None) or "").strip()
        recipient_phone = (data.pop("recipient_phone", None) or "").strip()
        delivery_method = (data.pop("delivery_method", None) or "").strip()
        payment_method = (data.pop("payment_method", None) or "").strip()
        data["delivery_method"] = delivery_method[:48]
        data["payment_method"] = payment_method[:48]

        recipient_delivery_method = (data.pop("recipient_delivery_method", None) or "").strip()
        recipient_delivery_details = data.pop("recipient_delivery_details", None)
        if recipient_delivery_details is not None and not isinstance(recipient_delivery_details, dict):
            raise serializers.ValidationError({"recipient_delivery_details": "Must be a JSON object."})

        if rid is not None:
            user = self.context["request"].user
            try:
                rec = Recipient.objects.get(pk=rid, owner=user)
            except Recipient.DoesNotExist:
                raise serializers.ValidationError({"recipient_id": "Invalid recipient."})
            data["recipient"] = rec
            data["recipient_snapshot"] = {
                "full_name": rec.full_name,
                "email": rec.email or "",
                "phone_number": rec.phone_number or "",
                "delivery_method": rec.delivery_method or "",
                "delivery_details": rec.delivery_details or {},
            }
        elif recipient_full_name:
            data["recipient_snapshot"] = {
                "full_name": recipient_full_name,
                "email": recipient_email,
                "phone_number": recipient_phone,
                "delivery_method": recipient_delivery_method[:48] if recipient_delivery_method else "",
                "delivery_details": recipient_delivery_details or {},
            }

        from rates.services import snapshot_rates_dict

        snap = snapshot_rates_dict()
        snap["commission_rate"] = str(COMMISSION_RATE)
        snap["commission_on_top"] = commission_on_top
        data["rate_snapshot"] = snap

        return data

    def create(self, validated_data):
        """
        Persist user-submitted transfer: amounts/rates from validate(), FK recipient + snapshot,
        delivery/payment strings. Status defaults to pending on the model; timestamps auto-managed.
        """
        recipient = validated_data.pop("recipient", None)
        return Transaction.objects.create(recipient=recipient, **validated_data)


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
        instance.status = TransactionStatus.AWAITING_CONFIRMATION
        instance.save()
        return instance


class AdminTransactionSerializer(serializers.ModelSerializer):
    """Admin CRUD — confirm POP receipt, upload delivery proof, complete."""

    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.full_name", read_only=True)
    user_phone = serializers.CharField(source="user.phone", read_only=True)
    recipient = RecipientThinSerializer(read_only=True)
    conversion_breakdown = serializers.SerializerMethodField()
    reference_code = serializers.SerializerMethodField()
    confirm_receipt = serializers.BooleanField(write_only=True, required=False)
    pop_file = serializers.FileField(read_only=True)
    receipt_file = serializers.FileField(read_only=True)
    delivery_proof = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "reference_code",
            "user_email",
            "user_full_name",
            "user_phone",
            "mode",
            "input_amount",
            "input_currency",
            "result_amount",
            "result_currency",
            "commission_rate",
            "purpose",
            "delivery_method",
            "payment_method",
            "status",
            "pop_file",
            "receipt_file",
            "delivery_proof",
            "receipt_confirmed",
            "receipt_confirmed_at",
            "completed_at",
            "admin_note",
            "admin_notes",
            "recipient",
            "recipient_snapshot",
            "rate_snapshot",
            "conversion_breakdown",
            "confirm_receipt",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "reference_code",
            "user_email",
            "user_full_name",
            "user_phone",
            "mode",
            "input_amount",
            "input_currency",
            "result_amount",
            "result_currency",
            "commission_rate",
            "purpose",
            "pop_file",
            "receipt_file",
            "receipt_confirmed",
            "receipt_confirmed_at",
            "completed_at",
            "recipient",
            "recipient_snapshot",
            "rate_snapshot",
            "conversion_breakdown",
            "created_at",
        ]

    def get_reference_code(self, obj: Transaction) -> str:
        hx = str(obj.pk).replace("-", "")[:8].upper()
        return f"KRP-{hx}"

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

    def update(self, instance: Transaction, validated_data):
        confirm = validated_data.pop("confirm_receipt", False)
        if confirm:
            if instance.status != TransactionStatus.AWAITING_CONFIRMATION:
                raise serializers.ValidationError(
                    {"confirm_receipt": "Only allowed while awaiting confirmation."},
                )
            validated_data["receipt_confirmed"] = True
            validated_data["receipt_confirmed_at"] = timezone.now()

        new_status = validated_data.get("status", instance.status)
        incoming_proof = validated_data.get("delivery_proof")

        if new_status == TransactionStatus.COMPLETED:
            effective_rc = validated_data.get("receipt_confirmed", instance.receipt_confirmed)
            if confirm:
                effective_rc = True
            if not effective_rc:
                raise serializers.ValidationError(
                    {"status": "Confirm receipt before marking completed."},
                )
            has_proof = bool(incoming_proof or instance.delivery_proof or instance.receipt_file)
            if not has_proof:
                raise serializers.ValidationError(
                    {"delivery_proof": "Upload delivery proof before marking completed."},
                )
            validated_data.setdefault("completed_at", timezone.now())

        return super().update(instance, validated_data)

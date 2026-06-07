"""Validation helpers for PaymentReceivingConfig.details."""
from __future__ import annotations

from rest_framework import serializers

CORRIDOR_CHOICES = ("russia-zambia", "zambia-russia")

PAYMENT_METHODS_BY_CORRIDOR: dict[str, tuple[str, ...]] = {
    "russia-zambia": ("pay_bank_ru", "pay_crypto_usdt"),
    "zambia-russia": ("pay_mobile_money", "pay_crypto_usdt"),
}

BANK_RU_FIELDS = ("phone", "account_name", "bank_name")
CRYPTO_FIELDS = ("address", "network")
MOBILE_MONEY_FIELDS = ("display_number",)


def validate_payment_receiving_details(payment_method: str, details: dict, *, require_inline: bool) -> dict:
    if not isinstance(details, dict):
        raise serializers.ValidationError({"details": "Must be an object."})

    instructions = details.get("instructions")
    if instructions is not None:
        if not isinstance(instructions, list) or not all(isinstance(x, str) for x in instructions):
            raise serializers.ValidationError({"details": "instructions must be a list of strings."})
    else:
        instructions = []

    out: dict = {"instructions": [s.strip() for s in instructions if s.strip()]}

    if payment_method == "pay_bank_ru":
        for key in BANK_RU_FIELDS:
            val = (details.get(key) or "").strip() if isinstance(details.get(key), str) else ""
            if require_inline and not val:
                raise serializers.ValidationError({"details": f"{key} is required when showing details on site."})
            if val:
                out[key] = val
    elif payment_method == "pay_crypto_usdt":
        for key in CRYPTO_FIELDS:
            val = (details.get(key) or "").strip() if isinstance(details.get(key), str) else ""
            if require_inline and not val:
                raise serializers.ValidationError({"details": f"{key} is required when showing details on site."})
            if val:
                out[key] = val
    elif payment_method == "pay_mobile_money":
        val = (details.get("display_number") or "").strip() if isinstance(details.get("display_number"), str) else ""
        if require_inline and not val:
            raise serializers.ValidationError({"details": "display_number is required when showing details on site."})
        if val:
            out["display_number"] = val
    else:
        raise serializers.ValidationError({"payment_method": "Unsupported payment method."})

    return out


def default_details_for(payment_method: str) -> dict:
    if payment_method == "pay_bank_ru":
        return {
            "phone": "+7 999 071-50-94",
            "account_name": "Каванда Ч",
            "bank_name": "Сбербанк",
            "instructions": [
                "Send only the amount shown for this transfer. Use the phone, recipient name, and bank exactly as listed.",
                "After paying, upload proof of payment on the next step before the timer ends.",
            ],
        }
    if payment_method == "pay_crypto_usdt":
        return {
            "address": "TXYZkrp7PLACEHOLDER9n3Q8Z7aB2cD4eF6gH",
            "network": "TRC20 (Tron)",
            "instructions": [
                "Send only USDT on the network below. Wrong token or network can result in permanent loss.",
                "Double-check the address character by character before confirming in your wallet.",
            ],
        }
    if payment_method == "pay_mobile_money":
        return {
            "display_number": "260771330585",
            "instructions": [
                "Open your mobile money app and send only the amount shown on the next screen (when available).",
                "Use this number as the recipient: 260771330585.",
                "Need help? Reach us on WhatsApp or email — see the contact block in the app footer.",
            ],
        }
    return {"instructions": []}

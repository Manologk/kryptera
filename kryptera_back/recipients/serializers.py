from rest_framework import serializers

from .models import Recipient


class RecipientSerializer(serializers.ModelSerializer):
    """REST shape uses camelCase-ish keys via renderer; API receives snake_case."""

    class Meta:
        model = Recipient
        fields = [
            "id",
            "full_name",
            "email",
            "phone_number",
            "delivery_method",
            "delivery_details",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        if self.instance is None:
            dm = (attrs.get("delivery_method") or "").strip()
        else:
            raw = attrs["delivery_method"] if "delivery_method" in attrs else self.instance.delivery_method
            dm = (raw or "").strip()
        if not dm:
            raise serializers.ValidationError(
                {
                    "delivery_method": "Every recipient must have a delivery method (e.g. bank deposit or mobile money).",
                }
            )
        attrs["delivery_method"] = dm[:48]

        phone = (attrs.get("phone_number") if "phone_number" in attrs else None)
        if phone is None and self.instance is not None:
            phone = self.instance.phone_number
        phone = (phone or "").strip()
        if not phone and dm == "mobile_money":
            details = attrs.get("delivery_details")
            if details is None and self.instance is not None:
                details = self.instance.delivery_details
            if isinstance(details, dict):
                wallet = (details.get("wallet_number") or "").strip()
                if wallet:
                    phone = wallet
        if phone:
            attrs["phone_number"] = phone[:50]
        elif "phone_number" in attrs:
            attrs["phone_number"] = ""

        return attrs


class RecipientThinSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recipient
        fields = ["id", "full_name", "email", "phone_number", "delivery_method", "delivery_details"]

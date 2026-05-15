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
        return attrs


class RecipientThinSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recipient
        fields = ["id", "full_name", "email", "phone_number", "delivery_method", "delivery_details"]

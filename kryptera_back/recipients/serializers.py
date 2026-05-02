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
            if not dm:
                raise serializers.ValidationError({"delivery_method": "This field is required when creating a recipient."})
        return attrs


class RecipientThinSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recipient
        fields = ["id", "full_name", "email", "phone_number", "delivery_method", "delivery_details"]

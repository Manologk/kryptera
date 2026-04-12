from rest_framework import serializers

from .models import Recipient


class RecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recipient
        fields = [
            "id",
            "label",
            "full_name",
            "email",
            "phone",
            "payout_details",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class RecipientThinSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recipient
        fields = ["id", "label", "full_name", "email", "phone"]

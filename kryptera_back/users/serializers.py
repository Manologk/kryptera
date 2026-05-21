"""
users/serializers.py
"""
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from django.utils import timezone

from .kyc import validate_kyc_doc_file
from .models import KycStatus, User


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, label="Confirm password")

    class Meta:
        model  = User
        fields = ["email", "full_name", "phone", "password", "password2"]

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return data

    def create(self, validated_data):
        validated_data.pop("password2")
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data["email"], password=data["password"])
        if not user:
            raise serializers.ValidationError("Invalid credentials.")
        if not user.is_active:
            raise serializers.ValidationError(
                "This account has been deactivated. Contact support if you need help."
            )
        if user.suspended_until and user.suspended_until > timezone.now():
            raise serializers.ValidationError(
                "This account is temporarily suspended. Please try again later or contact support."
            )
        data["user"] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = [
            "id", "email", "full_name", "phone",
            "is_admin", "kyc_status",
            "kyc_legal_name", "kyc_id_number", "kyc_country",
            "kyc_submitted_at", "kyc_rejection_reason",
            "created_at",
            "suspended_until", "suspension_reason",
        ]
        read_only_fields = [
            "id", "is_admin", "kyc_status",
            "kyc_legal_name", "kyc_id_number", "kyc_country",
            "kyc_submitted_at", "kyc_rejection_reason",
            "created_at",
            "suspended_until", "suspension_reason",
        ]


class KycSubmitSerializer(serializers.Serializer):
    kyc_doc = serializers.FileField()
    kyc_legal_name = serializers.CharField(max_length=255)
    kyc_id_number = serializers.CharField(max_length=64)
    kyc_country = serializers.CharField(max_length=64)

    def validate_kyc_doc(self, value):
        return validate_kyc_doc_file(value)

    def validate_kyc_legal_name(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Legal name is required.")
        return value

    def validate_kyc_id_number(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("ID number is required.")
        return value

    def validate_kyc_country(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Country is required.")
        if len(value) > 64:
            raise serializers.ValidationError("Country must be at most 64 characters.")
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if user.kyc_status == KycStatus.PENDING:
            raise serializers.ValidationError(
                {"detail": "Your verification is already under review."}
            )
        if user.kyc_status == KycStatus.VERIFIED:
            raise serializers.ValidationError(
                {"detail": "Your identity is already verified."}
            )
        if user.kyc_status not in (KycStatus.NOT_SUBMITTED, KycStatus.REJECTED):
            raise serializers.ValidationError({"detail": "Cannot submit KYC at this time."})
        return attrs

    def save(self):
        user = self.context["request"].user
        data = self.validated_data
        if user.kyc_doc:
            user.kyc_doc.delete(save=False)
        user.kyc_doc = data["kyc_doc"]
        user.kyc_legal_name = data["kyc_legal_name"]
        user.kyc_id_number = data["kyc_id_number"]
        user.kyc_country = data["kyc_country"]
        user.kyc_status = KycStatus.PENDING
        user.kyc_submitted_at = timezone.now()
        user.kyc_rejection_reason = ""
        user.save(
            update_fields=[
                "kyc_doc",
                "kyc_legal_name",
                "kyc_id_number",
                "kyc_country",
                "kyc_status",
                "kyc_submitted_at",
                "kyc_rejection_reason",
                "updated_at",
            ]
        )
        return user


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "phone",
            "is_admin",
            "is_active",
            "is_staff",
            "kyc_status",
            "kyc_legal_name",
            "kyc_id_number",
            "kyc_country",
            "kyc_submitted_at",
            "kyc_rejection_reason",
            "suspended_until",
            "suspension_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "is_admin",
            "is_staff",
            "kyc_legal_name",
            "kyc_id_number",
            "kyc_country",
            "kyc_submitted_at",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        instance = self.instance
        if instance is None:
            return attrs
        new_status = attrs.get("kyc_status", instance.kyc_status)
        if "kyc_status" in attrs and new_status != instance.kyc_status:
            if instance.kyc_status != KycStatus.PENDING:
                raise serializers.ValidationError(
                    {"kyc_status": "KYC status can only be changed while pending review."}
                )
            if new_status not in (KycStatus.VERIFIED, KycStatus.REJECTED):
                raise serializers.ValidationError(
                    {"kyc_status": "Admins may only set verified or rejected."}
                )
            if new_status == KycStatus.REJECTED:
                reason = (attrs.get("kyc_rejection_reason") or "").strip()
                if not reason:
                    attrs.setdefault(
                        "kyc_rejection_reason",
                        "Verification could not be completed. Please resubmit with clearer documents.",
                    )
            elif new_status == KycStatus.VERIFIED:
                attrs["kyc_rejection_reason"] = ""
        return attrs


class TokenPairSerializer(serializers.Serializer):
    """Returns both access and refresh tokens alongside user data."""
    access  = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)
    user    = UserSerializer(read_only=True)

    @staticmethod
    def get_tokens(user: User) -> dict:
        refresh = RefreshToken.for_user(user)
        return {
            "refresh": str(refresh),
            "access":  str(refresh.access_token),
            "user":    UserSerializer(user).data,
        }

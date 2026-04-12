"""
users/serializers.py
"""
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


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
            "is_admin", "kyc_status", "created_at",
            "suspended_until", "suspension_reason",
        ]
        read_only_fields = [
            "id", "is_admin", "kyc_status", "created_at",
            "suspended_until", "suspension_reason",
        ]


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
            "suspended_until",
            "suspension_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "email", "is_admin", "is_staff", "created_at", "updated_at"]


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

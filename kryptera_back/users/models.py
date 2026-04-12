"""
users/models.py — Custom User model
Extends AbstractBaseUser for email-based auth.
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email: str, password: str | None = None, **extra):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("is_admin", True)
        return self.create_user(email, password, **extra)


class KycStatus(models.TextChoices):
    NOT_SUBMITTED = "not_submitted", "Not Submitted"
    PENDING       = "pending",       "Pending"
    VERIFIED      = "verified",      "Verified"
    REJECTED      = "rejected",      "Rejected"


class User(AbstractBaseUser, PermissionsMixin):
    email      = models.EmailField(unique=True)
    full_name  = models.CharField(max_length=255, blank=True)
    phone      = models.CharField(max_length=50, blank=True)
    is_admin   = models.BooleanField(default=False)
    is_staff   = models.BooleanField(default=False)  # Django admin access
    is_active  = models.BooleanField(default=True)
    suspended_until = models.DateTimeField(null=True, blank=True)
    suspension_reason = models.TextField(blank=True)

    # KYC
    kyc_status = models.CharField(
        max_length=20, choices=KycStatus.choices, default=KycStatus.NOT_SUBMITTED
    )
    kyc_doc = models.FileField(upload_to="kyc/", null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.email

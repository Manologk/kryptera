from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ["email", "full_name", "is_admin", "kyc_status", "created_at"]
    list_filter   = ["is_admin", "kyc_status", "is_active"]
    search_fields = ["email", "full_name"]
    ordering      = ["-created_at"]

    fieldsets = (
        (None,          {"fields": ("email", "password")}),
        ("Profile",     {"fields": ("full_name", "phone")}),
        ("KYC",         {"fields": (
            "kyc_status", "kyc_legal_name", "kyc_id_number", "kyc_country",
            "kyc_submitted_at", "kyc_rejection_reason", "kyc_doc",
        )}),
        ("Permissions", {"fields": ("is_admin", "is_staff", "is_active", "is_superuser", "groups", "user_permissions")}),
        ("Dates",       {"fields": ("last_login",)}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "full_name", "password1", "password2"),
        }),
    )

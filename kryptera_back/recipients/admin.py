from django.contrib import admin

from .models import Recipient


@admin.register(Recipient)
class RecipientAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "label", "full_name", "email", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["full_name", "email", "user__email"]

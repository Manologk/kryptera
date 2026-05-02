from django.contrib import admin

from .models import Recipient


@admin.register(Recipient)
class RecipientAdmin(admin.ModelAdmin):
    list_display = ["id", "owner", "full_name", "email", "phone_number", "delivery_method", "created_at"]
    search_fields = ["full_name", "email", "phone_number", "owner__email"]

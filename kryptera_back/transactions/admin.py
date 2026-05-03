from django.contrib import admin
from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display  = ["id", "user", "mode", "input_amount", "input_currency", "result_amount", "result_currency", "status", "created_at"]
    list_filter   = ["status", "mode", "input_currency"]
    search_fields = ["user__email", "id"]
    readonly_fields = [
        "id",
        "user",
        "mode",
        "input_amount",
        "input_currency",
        "result_amount",
        "result_currency",
        "commission_rate",
        "created_at",
        "updated_at",
    ]
    ordering      = ["-created_at"]

    fieldsets = (
        ("Transaction",  {"fields": ("id", "user", "mode", "input_amount", "input_currency", "result_amount", "result_currency", "commission_rate", "purpose", "delivery_method", "payment_method")}),
        ("Status",       {"fields": ("status", "admin_note", "admin_notes", "receipt_confirmed", "receipt_confirmed_at", "completed_at")}),
        ("Files",        {"fields": ("pop_file", "receipt_file", "delivery_proof")}),
        ("Timestamps",   {"fields": ("created_at", "updated_at")}),
    )

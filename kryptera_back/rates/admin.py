from django.contrib import admin
from .models import Currency, ExchangeRate, ExchangeRateQuote, PlatformSettings, RateAuditLog, RateQuoteAuditLog


@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ["commission_rate", "updated_at"]

    def has_add_permission(self, request):
        return not PlatformSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "is_enabled", "sort_order", "updated_at"]
    search_fields = ["code", "name"]


@admin.register(ExchangeRateQuote)
class ExchangeRateQuoteAdmin(admin.ModelAdmin):
    list_display = ["slug", "rate", "is_active", "updated_at", "updated_by"]
    list_filter = ["is_active"]


@admin.register(RateQuoteAuditLog)
class RateQuoteAuditLogAdmin(admin.ModelAdmin):
    list_display = ["created_at", "slug", "old_rate", "new_rate", "changed_by"]
    readonly_fields = ["created_at", "changed_by", "slug", "old_rate", "new_rate"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display  = ["ruble_to_usd_buying", "usd_to_kwacha_selling", "kwacha_to_usd_buying", "usd_to_ruble_selling", "updated_at", "updated_by"]
    readonly_fields = ["updated_at", "updated_by"]

    def has_add_permission(self, request):
        return not ExchangeRate.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(RateAuditLog)
class RateAuditLogAdmin(admin.ModelAdmin):
    list_display  = ["created_at", "changed_by", "ruble_to_usd_buying", "usd_to_kwacha_selling"]
    readonly_fields = list_display

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

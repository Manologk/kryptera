from django.urls import path

from .views import ExchangeRateView, PlatformCommissionView, RateAuditLogView

urlpatterns = [
    path("", ExchangeRateView.as_view(), name="rates"),
    path("commission/", PlatformCommissionView.as_view(), name="rates-commission"),
    path("history/", RateAuditLogView.as_view(), name="rates-history"),
]

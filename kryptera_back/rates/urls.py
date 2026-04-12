from django.urls import path
from .views import ExchangeRateView, RateAuditLogView

urlpatterns = [
    path("",         ExchangeRateView.as_view(),  name="rates"),
    path("history/", RateAuditLogView.as_view(),  name="rates-history"),
]

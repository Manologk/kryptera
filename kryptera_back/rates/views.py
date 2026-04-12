"""
rates/views.py
GET  /api/v1/rates/         — public, effective rates (quotes + fallback)
PUT  /api/v1/rates/         — admin only, updates quotes + singleton + audit
GET  /api/v1/rates/history/ — admin only, legacy full snapshot audit log
"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Currency, ExchangeRate, RateAuditLog
from .permissions import IsAdminUser
from .serializers import (
    CurrencySerializer,
    ExchangeRateSerializer,
    RateAuditLogSerializer,
)
from .services import persist_rates_from_request


class CurrencyPublicListView(generics.ListAPIView):
    """GET /api/v1/currencies/ — enabled currencies for converter UI."""

    serializer_class = CurrencySerializer
    permission_classes = [permissions.AllowAny]
    queryset = Currency.objects.filter(is_enabled=True)


class ExchangeRateView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [IsAdminUser()]

    def get(self, request):
        rate = ExchangeRate.load()
        return Response(ExchangeRateSerializer(rate).data)

    def put(self, request):
        serializer = ExchangeRateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        v = serializer.validated_data
        persist_rates_from_request(
            ruble_to_usd_buying=v["ruble_to_usd_buying"],
            usd_to_kwacha_selling=v["usd_to_kwacha_selling"],
            kwacha_to_usd_buying=v["kwacha_to_usd_buying"],
            usd_to_ruble_selling=v["usd_to_ruble_selling"],
            user=request.user,
        )
        return Response(ExchangeRateSerializer(ExchangeRate.load()).data)


class RateAuditLogView(generics.ListAPIView):
    """GET /api/v1/rates/history/ — admin only."""
    serializer_class = RateAuditLogSerializer
    permission_classes = [IsAdminUser]
    queryset = RateAuditLog.objects.select_related("changed_by").all()

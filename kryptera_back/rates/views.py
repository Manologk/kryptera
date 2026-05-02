"""
rates/views.py
GET  /api/v1/rates/              — public, effective rates + commission fraction
PUT  /api/v1/rates/             — admin only, updates quotes + singleton + audit
PATCH /api/v1/rates/commission/ — admin only, update platform commission
GET  /api/v1/rates/history/     — admin only, legacy full snapshot audit log
"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Currency, ExchangeRate, PlatformSettings, RateAuditLog
from .permissions import IsAdminUser
from .serializers import (
    CurrencySerializer,
    ExchangeRateSerializer,
    PlatformCommissionSerializer,
    RateAuditLogSerializer,
)
from .services import get_commission_rate, persist_rates_from_request


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
        data = ExchangeRateSerializer(rate).data
        data["commission_rate"] = str(get_commission_rate())
        return Response(data)

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
        out = ExchangeRateSerializer(ExchangeRate.load()).data
        out["commission_rate"] = str(get_commission_rate())
        return Response(out)


class PlatformCommissionView(APIView):
    """PATCH /api/v1/rates/commission/ — admin updates singleton commission."""

    permission_classes = [IsAdminUser]

    def patch(self, request):
        ser = PlatformCommissionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        rate = ser.validated_data["commission_rate"]
        obj, _ = PlatformSettings.objects.update_or_create(
            pk=1,
            defaults={"commission_rate": rate},
        )
        return Response(
            {
                "commission_rate": str(obj.commission_rate),
                "updated_at": obj.updated_at.isoformat().replace("+00:00", "Z"),
            }
        )


class RateAuditLogView(generics.ListAPIView):
    """GET /api/v1/rates/history/ — admin only."""
    serializer_class = RateAuditLogSerializer
    permission_classes = [IsAdminUser]
    queryset = RateAuditLog.objects.select_related("changed_by").all()

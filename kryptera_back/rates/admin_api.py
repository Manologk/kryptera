"""Admin-only endpoints for currencies and rate quotes (IsAdminUser)."""
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Currency, ExchangeRateQuote, RateQuoteAuditLog
from .permissions import IsAdminUser
from .serializers import (
    CurrencySerializer,
    ExchangeRateQuoteCreateSerializer,
    ExchangeRateQuoteSerializer,
    RateQuoteAuditLogSerializer,
)
from .services import SLUG_TO_FIELD, sync_singleton_from_quotes_db


class AdminCurrencyListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = CurrencySerializer
    queryset = Currency.objects.all()


class AdminCurrencyDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = CurrencySerializer
    queryset = Currency.objects.all()
    lookup_field = "pk"


class AdminExchangeRateQuoteListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    queryset = ExchangeRateQuote.objects.all()

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ExchangeRateQuoteCreateSerializer
        return ExchangeRateQuoteSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        data = ExchangeRateQuoteSerializer(serializer.instance).data
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        instance = serializer.save(updated_by=self.request.user)
        RateQuoteAuditLog.objects.create(
            changed_by=self.request.user,
            slug=instance.slug,
            old_rate=Decimal("0"),
            new_rate=instance.rate,
        )
        if instance.slug in SLUG_TO_FIELD:
            sync_singleton_from_quotes_db(updated_by=self.request.user)


class AdminExchangeRateQuoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = ExchangeRateQuoteSerializer
    queryset = ExchangeRateQuote.objects.all()
    lookup_field = "pk"

    def perform_update(self, serializer):
        old_rate = self.get_object().rate
        instance = serializer.save(updated_by=self.request.user)
        new_rate = instance.rate
        if old_rate != new_rate:
            RateQuoteAuditLog.objects.create(
                changed_by=self.request.user,
                slug=instance.slug,
                old_rate=old_rate,
                new_rate=new_rate,
            )
        if instance.slug in SLUG_TO_FIELD:
            sync_singleton_from_quotes_db(updated_by=self.request.user)

    def perform_destroy(self, instance):
        if instance.slug in SLUG_TO_FIELD:
            instance.is_active = False
            instance.updated_by = self.request.user
            instance.save(update_fields=["is_active", "updated_at", "updated_by"])
            sync_singleton_from_quotes_db(updated_by=self.request.user)
        else:
            instance.delete()


class AdminRateQuoteAuditListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = RateQuoteAuditLogSerializer
    queryset = RateQuoteAuditLog.objects.select_related("changed_by").all()


class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from transactions.commission_zmw import commission_amount_zmw
        from transactions.models import Transaction, TransactionStatus
        from users.models import User

        tx_all = Transaction.objects.all()
        tx_completed = Transaction.objects.filter(status=TransactionStatus.COMPLETED)
        by_status = dict(tx_all.values("status").annotate(c=Count("id")).values_list("status", "c"))
        from transactions.serializers import quantize_money

        total_commission_zmw = quantize_money(
            sum(
                (commission_amount_zmw(t) for t in tx_completed.iterator()),
                start=Decimal("0"),
            )
        )

        return Response(
            {
                "user_count": User.objects.filter(is_active=True).count(),
                "admin_count": User.objects.filter(is_admin=True).count(),
                "transaction_total": tx_completed.count(),
                "transactions_by_status": by_status,
                "total_commission_zmw": str(total_commission_zmw),
                "pending_verification_count": by_status.get(TransactionStatus.PENDING_VERIFICATION, 0),
                "enabled_currency_count": Currency.objects.filter(is_enabled=True).count(),
            }
        )


class AdminDashboardTransactionsByDayView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from transactions.models import Currency, Transaction, TransactionStatus

        try:
            days = int(request.query_params.get("days", "30"))
        except (TypeError, ValueError):
            days = 30
        days = max(1, min(days, 365))
        since = timezone.now() - timedelta(days=days)

        rows = (
            Transaction.objects.filter(created_at__gte=since, status=TransactionStatus.COMPLETED)
            .annotate(d=TruncDate("created_at"))
            .values("d")
            .annotate(
                volume_zmw=Coalesce(
                    Sum("input_amount", filter=Q(input_currency=Currency.ZMW)),
                    Value(Decimal("0")),
                ),
                volume_rub=Coalesce(
                    Sum("input_amount", filter=Q(input_currency=Currency.RUB)),
                    Value(Decimal("0")),
                ),
            )
            .order_by("d")
        )
        out = []
        for r in rows:
            d = r["d"]
            out.append(
                {
                    "date": d.isoformat() if d else None,
                    "volume_zmw": str(r["volume_zmw"]),
                    "volume_rub": str(r["volume_rub"]),
                }
            )
        return Response({"days": days, "series": out})


# Backwards-compatible alias for URL imports
AdminExchangeRateQuoteListView = AdminExchangeRateQuoteListCreateView

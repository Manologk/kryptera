"""
transactions/views.py

User endpoints:
  GET  /api/v1/transactions/                — list own transactions
  POST /api/v1/transactions/                — create transaction
  GET  /api/v1/transactions/<id>/           — retrieve own transaction
  POST /api/v1/transactions/<id>/pop/       — upload proof of payment

Admin endpoints:
  GET   /api/v1/transactions/admin/         — list all transactions
  PATCH /api/v1/transactions/admin/<id>/    — update status / add note
"""
import uuid

from django.db.models import Q
from django.utils.dateparse import parse_datetime
from rest_framework import generics, permissions, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from rates.permissions import IsAdminUser

from .pagination import AdminTransactionPagination
from .models import Transaction, TransactionStatus
from .serializers import (
    AdminTransactionSerializer,
    PopUploadSerializer,
    TransactionSerializer,
)


# ── User views ─────────────────────────────────────────────────────────────

class TransactionListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/transactions/"""
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).select_related("user", "recipient")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TransactionDetailView(generics.RetrieveAPIView):
    """GET /api/v1/transactions/<id>/"""
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        try:
            tx = Transaction.objects.select_related("user", "recipient").get(pk=self.kwargs["pk"])
        except Transaction.DoesNotExist:
            raise NotFound("Transaction not found.")
        if tx.user != self.request.user and not self.request.user.is_admin:
            raise PermissionDenied()
        return tx


class PopUploadView(APIView):
    """POST /api/v1/transactions/<id>/pop/ — upload proof of payment."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        try:
            tx = Transaction.objects.select_related("recipient").get(pk=pk, user=request.user)
        except Transaction.DoesNotExist:
            raise NotFound("Transaction not found.")

        if tx.pop_file:
            return Response(
                {"detail": "Proof of payment already uploaded."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if tx.status not in (
            TransactionStatus.PENDING,
            TransactionStatus.POP_NOT_UPLOADED,
        ):
            return Response(
                {"detail": "Cannot upload proof for this transaction status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PopUploadSerializer(tx, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        tx.refresh_from_db()
        return Response(TransactionSerializer(tx, context={"request": request}).data, status=status.HTTP_200_OK)


# ── Admin views ────────────────────────────────────────────────────────────

class AdminTransactionListView(generics.ListAPIView):
    """GET /api/v1/transactions/admin/ — all transactions, admin only."""
    serializer_class = AdminTransactionSerializer
    permission_classes = [IsAdminUser]
    pagination_class = AdminTransactionPagination

    def get_queryset(self):
        qs = Transaction.objects.select_related("user", "recipient").all()
        p = self.request.query_params

        if v := p.get("status"):
            qs = qs.filter(status=v)
        if v := p.get("status_in"):
            valid = {choice for choice, _ in TransactionStatus.choices}
            wanted = [s.strip() for s in v.split(",") if s.strip() in valid]
            if wanted:
                qs = qs.filter(status__in=wanted)
        if v := p.get("mode"):
            qs = qs.filter(mode=v)
        if v := p.get("user"):
            qs = qs.filter(user_id=v)
        if v := p.get("input_currency"):
            qs = qs.filter(input_currency=v)
        if v := p.get("result_currency"):
            qs = qs.filter(result_currency=v)

        if v := p.get("created_after"):
            dt = parse_datetime(v)
            if dt:
                qs = qs.filter(created_at__gte=dt)
        if v := p.get("created_before"):
            dt = parse_datetime(v)
            if dt:
                qs = qs.filter(created_at__lte=dt)

        if s := p.get("search"):
            q = Q(purpose__icontains=s) | Q(user__email__icontains=s)
            try:
                uid = uuid.UUID(str(s).strip())
                q |= Q(pk=uid)
            except (ValueError, TypeError, AttributeError):
                pass
            qs = qs.filter(q)

        ordering = (p.get("ordering") or "").strip()
        if ordering == "created_at":
            qs = qs.order_by("created_at")
        elif ordering == "-created_at":
            qs = qs.order_by("-created_at")

        return qs


class AdminTransactionDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/transactions/admin/<id>/ — update status or add note."""
    serializer_class = AdminTransactionSerializer
    permission_classes = [IsAdminUser]
    queryset = Transaction.objects.select_related("user", "recipient").all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]

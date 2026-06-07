"""Admin-only API routes under /api/v1/admin/."""
from django.urls import path

from rates.admin_api import (
    AdminCurrencyDetailView,
    AdminCurrencyListCreateView,
    AdminDashboardStatsView,
    AdminDashboardTransactionsByDayView,
    AdminExchangeRateQuoteDetailView,
    AdminExchangeRateQuoteListView,
    AdminRateQuoteAuditListView,
)
from rates.views import AdminPaymentReceivingDetailView, AdminPaymentReceivingListView
from users.admin_api import AdminUserDetailView, AdminUserKycDocumentView, AdminUserListView

urlpatterns = [
    path(
        "dashboard/transactions-by-day/",
        AdminDashboardTransactionsByDayView.as_view(),
        name="admin-dashboard-transactions-by-day",
    ),
    path("dashboard/stats/", AdminDashboardStatsView.as_view(), name="admin-dashboard-stats"),
    path("currencies/", AdminCurrencyListCreateView.as_view(), name="admin-currency-list"),
    path("currencies/<int:pk>/", AdminCurrencyDetailView.as_view(), name="admin-currency-detail"),
    path("rate-quotes/audit/", AdminRateQuoteAuditListView.as_view(), name="admin-rate-quote-audit"),
    path("rate-quotes/", AdminExchangeRateQuoteListView.as_view(), name="admin-rate-quote-list"),
    path("rate-quotes/<int:pk>/", AdminExchangeRateQuoteDetailView.as_view(), name="admin-rate-quote-detail"),
    path("payment-receiving/", AdminPaymentReceivingListView.as_view(), name="admin-payment-receiving-list"),
    path(
        "payment-receiving/<int:pk>/",
        AdminPaymentReceivingDetailView.as_view(),
        name="admin-payment-receiving-detail",
    ),
    path("users/", AdminUserListView.as_view(), name="admin-user-list"),
    path("users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path(
        "users/<int:pk>/kyc/document/",
        AdminUserKycDocumentView.as_view(),
        name="admin-user-kyc-document",
    ),
]

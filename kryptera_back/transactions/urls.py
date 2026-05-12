from django.urls import path
from .views import (
    AdminTransactionDetailView,
    AdminTransactionListView,
    PaymentWindowView,
    PopDownloadView,
    PopUploadView,
    TransactionDetailView,
    TransactionListCreateView,
)

urlpatterns = [
    # User-facing
    path("",              TransactionListCreateView.as_view(), name="transaction-list"),
    path("<uuid:pk>/",    TransactionDetailView.as_view(),    name="transaction-detail"),
    path("<uuid:pk>/payment-window/", PaymentWindowView.as_view(), name="transaction-payment-window"),
    path("<uuid:pk>/pop/download/", PopDownloadView.as_view(), name="transaction-pop-download"),
    path("<uuid:pk>/pop/", PopUploadView.as_view(), name="transaction-pop"),

    # Admin-facing
    path("admin/",            AdminTransactionListView.as_view(),   name="admin-transaction-list"),
    path("admin/<uuid:pk>/",  AdminTransactionDetailView.as_view(), name="admin-transaction-detail"),
]

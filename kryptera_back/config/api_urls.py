"""
config/api_urls.py — Versioned API routes
All endpoints live under /api/v1/
"""
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView
from rates.views import CurrencyPublicListView
from users.views import RegisterView, LoginView, MeView

urlpatterns = [
    # Auth
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/token/", LoginView.as_view(), name="auth-token"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    # Public / user data
    path("currencies/", CurrencyPublicListView.as_view(), name="currency-list"),
    path("recipients/", include("recipients.urls")),
    path("admin/", include("config.admin_urls")),
    # Exchange rates
    path("rates/", include("rates.urls")),
    # Transactions
    path("transactions/", include("transactions.urls")),
]

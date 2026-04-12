from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from .models import Currency, ExchangeRate, ExchangeRateQuote, RateAuditLog
from .services import sync_quotes_from_singleton


def make_rates():
    r, _ = ExchangeRate.objects.get_or_create(pk=1)
    r.ruble_to_usd_buying = Decimal("95.5")
    r.usd_to_kwacha_selling = Decimal("27.5")
    r.kwacha_to_usd_buying = Decimal("28.0")
    r.usd_to_ruble_selling = Decimal("96.0")
    r.save()
    sync_quotes_from_singleton()
    return ExchangeRate.load()


class RatesPublicTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        make_rates()

    def test_get_rates_public(self):
        res = self.client.get("/api/v1/rates/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("ruble_to_usd_buying", res.data)

    def test_put_rates_unauthenticated(self):
        res = self.client.put("/api/v1/rates/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class RatesAdminTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email="admin@test.com", password="pass", is_admin=True, is_staff=True
        )
        self.regular = User.objects.create_user(email="user@test.com", password="pass")
        make_rates()

    def test_put_rates_admin(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "ruble_to_usd_buying": "100.0",
            "usd_to_kwacha_selling": "30.0",
            "kwacha_to_usd_buying": "31.0",
            "usd_to_ruble_selling": "101.0",
        }
        res = self.client.put("/api/v1/rates/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["ruble_to_usd_buying"], "100.000000")
        self.assertEqual(RateAuditLog.objects.count(), 1)

    def test_put_rates_non_admin_forbidden(self):
        self.client.force_authenticate(user=self.regular)
        res = self.client.put("/api/v1/rates/", {
            "ruble_to_usd_buying": "100.0",
            "usd_to_kwacha_selling": "30.0",
            "kwacha_to_usd_buying": "31.0",
            "usd_to_ruble_selling": "101.0",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_put_rates_zero_rejected(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.put("/api/v1/rates/", {
            "ruble_to_usd_buying": "0",
            "usd_to_kwacha_selling": "27.5",
            "kwacha_to_usd_buying": "28.0",
            "usd_to_ruble_selling": "96.0",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_audit_log_viewable_by_admin(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/v1/rates/history/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_audit_log_forbidden_for_regular_user(self):
        self.client.force_authenticate(user=self.regular)
        res = self.client.get("/api/v1/rates/history/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_dashboard_stats_includes_enabled_currency_count(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/v1/admin/dashboard/stats/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("enabled_currency_count", res.data)
        self.assertEqual(res.data["enabled_currency_count"], Currency.objects.filter(is_enabled=True).count())

    def test_dashboard_transactions_by_day(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/v1/admin/dashboard/transactions-by-day/?days=7")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["days"], 7)
        self.assertIn("series", res.data)

    def test_post_rate_quote_admin(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            "/api/v1/admin/rate-quotes/",
            {"slug": "test_custom_rate", "rate": "1.5", "is_active": True},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["slug"], "test_custom_rate")
        q = ExchangeRateQuote.objects.get(slug="test_custom_rate")
        self.assertTrue(q.is_active)

    def test_delete_corridor_quote_soft_disables(self):
        self.client.force_authenticate(user=self.admin)
        q = ExchangeRateQuote.objects.get(slug="rub_usd_buy")
        res = self.client.delete(f"/api/v1/admin/rate-quotes/{q.pk}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        q.refresh_from_db()
        self.assertFalse(q.is_active)

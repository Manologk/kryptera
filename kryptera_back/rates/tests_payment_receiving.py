from rest_framework import status
from rest_framework.test import APITestCase

from rates.models import PaymentReceivingConfig
from users.models import User


class PaymentReceivingConfigAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="paycfg-user@test.com", password="pass")
        self.admin = User.objects.create_user(
            email="paycfg-admin@test.com",
            password="pass",
            is_admin=True,
        )
        self.config = PaymentReceivingConfig.objects.get(
            corridor="russia-zambia",
            payment_method="pay_bank_ru",
        )

    def test_public_list_requires_auth(self):
        res = self.client.get("/api/v1/payment-receiving/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_public_list_returns_seeded_rows(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get("/api/v1/payment-receiving/?corridor=russia-zambia")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.data, list)
        self.assertEqual(len(res.data), 2)
        methods = {row["payment_method"] for row in res.data}
        self.assertEqual(methods, {"pay_bank_ru", "pay_crypto_usdt"})

    def test_admin_patch_toggle_inline_requires_fields(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f"/api/v1/admin/payment-receiving/{self.config.pk}/",
            {"display_mode": "inline", "details": {"phone": "", "account_name": "", "bank_name": ""}},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_patch_inline_bank_success(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f"/api/v1/admin/payment-receiving/{self.config.pk}/",
            {
                "display_mode": "inline",
                "details": {
                    "phone": "+7 999 000-00-00",
                    "account_name": "Test Name",
                    "bank_name": "Test Bank",
                    "instructions": ["Pay exactly the shown amount."],
                },
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["display_mode"], "inline")
        self.assertEqual(res.data["details"]["bank_name"], "Test Bank")
        self.config.refresh_from_db()
        self.assertEqual(self.config.display_mode, "inline")

    def test_admin_patch_whatsapp_mode(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f"/api/v1/admin/payment-receiving/{self.config.pk}/",
            {"display_mode": "whatsapp"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["display_mode"], "whatsapp")

    def test_non_admin_cannot_patch(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.patch(
            f"/api/v1/admin/payment-receiving/{self.config.pk}/",
            {"display_mode": "whatsapp"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

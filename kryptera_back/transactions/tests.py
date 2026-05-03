from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from recipients.models import Recipient
from users.models import User
from rates.models import ExchangeRate
from rates.services import sync_quotes_from_singleton

from .models import Transaction, TransactionStatus
from .serializers import calculate_conversion


def make_rates():
    r, _ = ExchangeRate.objects.get_or_create(pk=1)
    r.ruble_to_usd_buying = Decimal("95.5")
    r.usd_to_kwacha_selling = Decimal("27.5")
    r.kwacha_to_usd_buying = Decimal("28.0")
    r.usd_to_ruble_selling = Decimal("96.0")
    r.save()
    sync_quotes_from_singleton()
    return ExchangeRate.load()


class ConversionMathTests(TestCase):
    """Pure unit tests — no HTTP."""
    def setUp(self):
        self.rates = make_rates()

    def test_russia_to_zambia(self):
        # 10000 * 0.955 / 95.5 * 27.5 = 2750 ZMW
        result = calculate_conversion("russia-zambia", Decimal("10000"), self.rates)
        self.assertAlmostEqual(float(result), 2750.0, places=2)

    def test_zambia_to_russia(self):
        # 10000 * 0.955 / 28.0 * 96.0 = 32742.857... RUB
        result = calculate_conversion("zambia-russia", Decimal("10000"), self.rates)
        self.assertAlmostEqual(float(result), 32742.857, places=1)

    def test_commission_applied(self):
        # 100 RUB → less than (100 / 95.5 * 27.5) because commission taken
        full = Decimal("100") / self.rates.ruble_to_usd_buying * self.rates.usd_to_kwacha_selling
        result = calculate_conversion("russia-zambia", Decimal("100"), self.rates)
        self.assertLess(result, full)

    def test_commission_on_top_uses_full_principal(self):
        # 100 RUB principal converts in full; same as 100/95.5*27.5 with no inside commission
        expected = Decimal("100") / self.rates.ruble_to_usd_buying * self.rates.usd_to_kwacha_selling
        result = calculate_conversion(
            "russia-zambia", Decimal("100"), self.rates, commission_on_top=True
        )
        self.assertAlmostEqual(float(result), float(expected), places=4)


class TransactionAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user  = User.objects.create_user(email="user@test.com",  password="pass")
        self.user2 = User.objects.create_user(email="user2@test.com", password="pass")
        self.admin = User.objects.create_user(
            email="admin@test.com", password="pass", is_admin=True
        )
        make_rates()

    def test_create_transaction(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/api/v1/transactions/", {
            "mode": "russia-zambia",
            "input_amount": "10000",
            "purpose": "Sending to Zambia",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], TransactionStatus.PENDING)
        self.assertEqual(res.data["input_currency"], "RUB")
        self.assertEqual(res.data["result_currency"], "ZMW")
        self.assertAlmostEqual(float(res.data["result_amount"]), 2750.0, places=2)

    def test_create_transaction_commission_on_top(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/v1/transactions/",
            {
                "mode": "russia-zambia",
                "input_amount": "10000",
                "commission_on_top": True,
                "purpose": "Test",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        # Full 10000 RUB converts (no 4.5% haircut) → 10000/95.5*27.5
        expected = Decimal("10000") / Decimal("95.5") * Decimal("27.5")
        self.assertAlmostEqual(float(res.data["result_amount"]), float(expected), places=2)
        self.assertTrue(res.data["rate_snapshot"].get("commission_on_top"))

    def test_create_transaction_unauthenticated(self):
        res = self.client.post("/api/v1/transactions/", {
            "mode": "russia-zambia", "input_amount": "10000",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_own_transactions_only(self):
        self.client.force_authenticate(user=self.user)
        self.client.post("/api/v1/transactions/", {
            "mode": "russia-zambia", "input_amount": "5000",
        }, format="json")
        # user2 creates one
        self.client.force_authenticate(user=self.user2)
        self.client.post("/api/v1/transactions/", {
            "mode": "zambia-russia", "input_amount": "1000",
        }, format="json")
        # user should see only their own
        self.client.force_authenticate(user=self.user)
        res = self.client.get("/api/v1/transactions/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        self.assertEqual(len(results), 1)

    def test_get_other_users_transaction_forbidden(self):
        self.client.force_authenticate(user=self.user)
        create = self.client.post("/api/v1/transactions/", {
            "mode": "russia-zambia", "input_amount": "5000",
        }, format="json")
        tx_id = create.data["id"]
        # user2 tries to read it
        self.client.force_authenticate(user=self.user2)
        res = self.client.get(f"/api/v1/transactions/{tx_id}/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_sees_all_transactions(self):
        self.client.force_authenticate(user=self.user)
        self.client.post("/api/v1/transactions/", {
            "mode": "russia-zambia", "input_amount": "5000",
        }, format="json")
        self.client.force_authenticate(user=self.user2)
        self.client.post("/api/v1/transactions/", {
            "mode": "zambia-russia", "input_amount": "1000",
        }, format="json")
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/v1/transactions/admin/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        self.assertGreaterEqual(len(results), 2)

    def test_admin_cannot_complete_without_receipt_and_proof(self):
        """Lifecycle requires confirm_receipt + delivery proof before completed."""
        self.client.force_authenticate(user=self.user)
        create = self.client.post("/api/v1/transactions/", {
            "mode": "russia-zambia", "input_amount": "5000",
        }, format="json")
        tx_id = create.data["id"]
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(f"/api/v1/transactions/admin/{tx_id}/", {
            "status": "completed", "admin_note": "Verified and completed."
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_negative_amount_rejected(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/api/v1/transactions/", {
            "mode": "russia-zambia", "input_amount": "-500",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_rates_configured_rejected(self):
        # Zero out rates (singleton + quotes)
        r = ExchangeRate.objects.get(pk=1)
        r.ruble_to_usd_buying = Decimal("0")
        r.save()
        sync_quotes_from_singleton()
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/api/v1/transactions/", {
            "mode": "russia-zambia", "input_amount": "5000",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_persists_recipient_delivery_payment_pending(self):
        """Proceed flow: saved recipient + methods stored; status pending; timestamps set."""
        self.client.force_authenticate(user=self.user)
        rec = Recipient.objects.create(
            owner=self.user,
            full_name="Jane Recipient",
            delivery_method="bank_deposit",
            delivery_details={"bank_name": "Test"},
        )
        res = self.client.post(
            "/api/v1/transactions/",
            {
                "mode": "russia-zambia",
                "input_amount": "5000",
                "recipient_id": rec.id,
                "delivery_method": "bank_deposit",
                "payment_method": "pay_mobile_money",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        tx = Transaction.objects.get(pk=res.data["id"])
        self.assertEqual(tx.user_id, self.user.id)
        self.assertEqual(tx.recipient_id, rec.id)
        self.assertEqual(tx.delivery_method, "bank_deposit")
        self.assertEqual(tx.payment_method, "pay_mobile_money")
        self.assertEqual(tx.status, TransactionStatus.PENDING)
        self.assertIsNotNone(tx.created_at)

    def test_pop_upload_sets_awaiting_confirmation(self):
        self.client.force_authenticate(user=self.user)
        create = self.client.post(
            "/api/v1/transactions/",
            {"mode": "russia-zambia", "input_amount": "1000"},
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        tx_id = create.data["id"]
        pop = SimpleUploadedFile("proof.jpg", b"\xff\xd8\xff fakejpeg", content_type="image/jpeg")
        res = self.client.post(
            f"/api/v1/transactions/{tx_id}/pop/",
            {"pop_file": pop},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], TransactionStatus.AWAITING_CONFIRMATION)
        tx = Transaction.objects.get(pk=tx_id)
        self.assertTrue(tx.pop_file)
        self.assertEqual(tx.status, TransactionStatus.AWAITING_CONFIRMATION)

    # ── Admin pending workflow (Phase 5) ────────────────────────────────────

    def _seed_pending_pair(self):
        """Create one tx in 'pending' and one in 'awaiting_confirmation'."""
        self.client.force_authenticate(user=self.user)
        c1 = self.client.post(
            "/api/v1/transactions/",
            {"mode": "russia-zambia", "input_amount": "1000"},
            format="json",
        )
        c2 = self.client.post(
            "/api/v1/transactions/",
            {"mode": "russia-zambia", "input_amount": "2000"},
            format="json",
        )
        tx2 = Transaction.objects.get(pk=c2.data["id"])
        tx2.status = TransactionStatus.AWAITING_CONFIRMATION
        tx2.save()
        return c1.data["id"], c2.data["id"]

    def test_admin_status_in_filter(self):
        pending_id, awaiting_id = self._seed_pending_pair()
        # Plus a completed one to ensure it's filtered out
        c3 = self.client.post(
            "/api/v1/transactions/",
            {"mode": "russia-zambia", "input_amount": "500"},
            format="json",
        )
        tx3 = Transaction.objects.get(pk=c3.data["id"])
        tx3.status = TransactionStatus.COMPLETED
        tx3.save()

        self.client.force_authenticate(user=self.admin)
        res = self.client.get(
            "/api/v1/transactions/admin/?status_in=pending,awaiting_confirmation",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        ids = {row["id"] for row in results}
        self.assertIn(pending_id, ids)
        self.assertIn(awaiting_id, ids)
        self.assertNotIn(c3.data["id"], ids)

    def test_admin_status_in_ignores_unknown_values(self):
        pending_id, _ = self._seed_pending_pair()
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(
            "/api/v1/transactions/admin/?status_in=pending,not_a_status",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        statuses = {row["status"] for row in results}
        self.assertEqual(statuses, {"pending"})
        self.assertTrue(any(r["id"] == pending_id for r in results))

    def test_admin_patch_completed_with_delivery_proof_and_confirm(self):
        _, awaiting_id = self._seed_pending_pair()
        proof = SimpleUploadedFile(
            "delivery.jpg", b"\xff\xd8\xff fakejpeg", content_type="image/jpeg"
        )
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f"/api/v1/transactions/admin/{awaiting_id}/",
            {
                "status": "completed",
                "delivery_proof": proof,
                "confirm_receipt": "true",
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "completed")
        tx = Transaction.objects.get(pk=awaiting_id)
        self.assertEqual(tx.status, TransactionStatus.COMPLETED)
        self.assertTrue(tx.delivery_proof)
        self.assertTrue(tx.receipt_confirmed)

    def test_admin_patch_completed_without_proof_rejected(self):
        _, awaiting_id = self._seed_pending_pair()
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f"/api/v1/transactions/admin/{awaiting_id}/",
            {"status": "completed", "confirm_receipt": True},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        tx = Transaction.objects.get(pk=awaiting_id)
        self.assertNotEqual(tx.status, TransactionStatus.COMPLETED)

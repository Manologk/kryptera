from decimal import Decimal

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TransactionTestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from rates.models import ExchangeRate
from rates.services import sync_quotes_from_singleton
from transactions.models import Transaction, TransactionStatus
from users.models import KycStatus, User

EMAIL_TEST_SETTINGS = {
    "EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend",
    "EMAIL_HOST": "smtp.test.example",
    "ADMIN_NOTIFICATION_EMAILS": ["admin-one@test.com", "admin-two@test.com"],
    "CELERY_TASK_ALWAYS_EAGER": True,
    "CELERY_TASK_EAGER_PROPAGATES": True,
    "FRONTEND_URL": "http://testserver",
}


def make_rates():
    r, _ = ExchangeRate.objects.get_or_create(pk=1)
    r.ruble_to_usd_buying = Decimal("95.5")
    r.usd_to_kwacha_selling = Decimal("27.5")
    r.kwacha_to_usd_buying = Decimal("28.0")
    r.usd_to_ruble_selling = Decimal("96.0")
    r.save()
    sync_quotes_from_singleton()
    return ExchangeRate.load()


def kyc_file():
    return SimpleUploadedFile("id.jpg", b"\xff\xd8\xff fakejpeg", content_type="image/jpeg")


def pop_file():
    return SimpleUploadedFile("proof.jpg", b"\xff\xd8\xff fakejpeg", content_type="image/jpeg")


@override_settings(**EMAIL_TEST_SETTINGS)
class NotificationEmailTests(TransactionTestCase):
    def setUp(self):
        mail.outbox.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="notify-user@test.com",
            password="pass",
            full_name="Notify User",
        )
        self.admin = User.objects.create_user(
            email="notify-admin@test.com",
            password="pass",
            is_admin=True,
        )
        make_rates()
        self.user.kyc_status = KycStatus.VERIFIED
        self.user.save(update_fields=["kyc_status", "updated_at"])

    def test_kyc_submit_sends_user_and_admin_emails(self):
        self.user.kyc_status = KycStatus.NOT_SUBMITTED
        self.user.save(update_fields=["kyc_status", "updated_at"])
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/v1/auth/kyc/",
            {
                "kyc_doc": kyc_file(),
                "kyc_legal_name": "Legal Name",
                "kyc_id_number": "ID999",
                "kyc_country": "ZM",
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 3)
        user_mails = [m for m in mail.outbox if m.to == ["notify-user@test.com"]]
        admin_mails = [m for m in mail.outbox if m.to[0].startswith("admin-")]
        self.assertEqual(len(user_mails), 1)
        self.assertEqual(len(admin_mails), 2)
        self.assertIn("verification received", user_mails[0].subject.lower())
        self.assertTrue(any(m.attachments for m in admin_mails))

    def test_kyc_approve_sends_user_email(self):
        self.user.kyc_status = KycStatus.PENDING
        self.user.save(update_fields=["kyc_status", "updated_at"])
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f"/api/v1/admin/users/{self.user.id}/",
            {"kyc_status": KycStatus.VERIFIED},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["notify-user@test.com"])
        self.assertIn("approved", mail.outbox[0].subject.lower())

    def test_kyc_reject_sends_user_email_with_reason(self):
        self.user.kyc_status = KycStatus.PENDING
        self.user.save(update_fields=["kyc_status", "updated_at"])
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f"/api/v1/admin/users/{self.user.id}/",
            {
                "kyc_status": KycStatus.REJECTED,
                "kyc_rejection_reason": "Document expired",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        body = mail.outbox[0].body
        self.assertIn("Document expired", body)

    def test_pop_upload_sends_admin_emails(self):
        self.client.force_authenticate(user=self.user)
        create = self.client.post(
            "/api/v1/transactions/",
            {
                "mode": "russia-zambia",
                "input_amount": "10000",
                "purpose": "Test",
            },
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        mail.outbox.clear()
        tx_id = create.data["id"]
        pop = self.client.post(
            f"/api/v1/transactions/{tx_id}/pop/",
            {"pop_file": pop_file()},
            format="multipart",
        )
        self.assertEqual(pop.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 2)
        self.assertTrue(all(m.to[0].startswith("admin-") for m in mail.outbox))
        self.assertTrue(any(m.attachments for m in mail.outbox))

    def test_transaction_completed_sends_user_email_with_proof(self):
        self.client.force_authenticate(user=self.user)
        create = self.client.post(
            "/api/v1/transactions/",
            {
                "mode": "russia-zambia",
                "input_amount": "5000",
                "purpose": "Family",
            },
            format="json",
        )
        tx_id = create.data["id"]
        tx = Transaction.objects.get(pk=tx_id)
        tx.status = TransactionStatus.AWAITING_CONFIRMATION
        tx.receipt_confirmed = True
        tx.save(update_fields=["status", "receipt_confirmed", "updated_at"])
        mail.outbox.clear()

        delivery = SimpleUploadedFile(
            "delivery.jpg", b"\xff\xd8\xff fakejpeg", content_type="image/jpeg"
        )
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f"/api/v1/transactions/admin/{tx_id}/",
            {"status": "completed", "delivery_proof": delivery},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["notify-user@test.com"])
        self.assertIn("completed", mail.outbox[0].subject.lower())
        self.assertTrue(mail.outbox[0].attachments)

    def test_kyc_submit_succeeds_without_admin_emails(self):
        self.user.kyc_status = KycStatus.NOT_SUBMITTED
        self.user.save(update_fields=["kyc_status", "updated_at"])
        with override_settings(ADMIN_NOTIFICATION_EMAILS=[]):
            mail.outbox.clear()
            self.client.force_authenticate(user=self.user)
            res = self.client.post(
                "/api/v1/auth/kyc/",
                {
                    "kyc_doc": kyc_file(),
                    "kyc_legal_name": "Legal",
                    "kyc_id_number": "X1",
                    "kyc_country": "ZM",
                },
                format="multipart",
            )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.kyc_status, KycStatus.PENDING)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["notify-user@test.com"])

    def test_pop_upload_succeeds_without_admin_emails(self):
        self.client.force_authenticate(user=self.user)
        create = self.client.post(
            "/api/v1/transactions/",
            {
                "mode": "russia-zambia",
                "input_amount": "10000",
                "purpose": "Test",
            },
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        tx_id = create.data["id"]
        with override_settings(ADMIN_NOTIFICATION_EMAILS=[]):
            mail.outbox.clear()
            pop = self.client.post(
                f"/api/v1/transactions/{tx_id}/pop/",
                {"pop_file": pop_file()},
                format="multipart",
            )
        self.assertEqual(pop.status_code, status.HTTP_200_OK)
        tx = Transaction.objects.get(pk=tx_id)
        self.assertTrue(tx.pop_file)
        self.assertEqual(len(mail.outbox), 0)

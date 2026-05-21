from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TransactionTestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from .models import KycStatus, User

KYC_TEST_EMAIL_SETTINGS = {
    "EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend",
    "EMAIL_HOST": "smtp.test.example",
    "ADMIN_NOTIFICATION_EMAILS": ["admin-kyc@test.com"],
    "CELERY_TASK_ALWAYS_EAGER": True,
    "CELERY_TASK_EAGER_PROPAGATES": True,
}


def kyc_file(name="id.jpg", body=b"\xff\xd8\xff fakejpeg"):
    return SimpleUploadedFile(name, body, content_type="image/jpeg")


@override_settings(**KYC_TEST_EMAIL_SETTINGS)
class KycTests(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="kyc@test.com", password="pass123", full_name="KYC User"
        )
        self.admin = User.objects.create_user(
            email="admin-kyc@test.com", password="pass123", is_admin=True
        )

    def _submit_payload(self):
        return {
            "kyc_doc": kyc_file(),
            "kyc_legal_name": "Jane Doe",
            "kyc_id_number": "AB123456",
            "kyc_country": "ZM",
        }

    def test_submit_sets_pending(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/v1/auth/kyc/", self._submit_payload(), format="multipart"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.kyc_status, KycStatus.PENDING)
        self.assertEqual(self.user.kyc_legal_name, "Jane Doe")
        self.assertTrue(self.user.kyc_doc)
        self.assertIsNotNone(self.user.kyc_submitted_at)

    def test_submit_blocked_when_pending(self):
        self.user.kyc_status = KycStatus.PENDING
        self.user.save(update_fields=["kyc_status", "updated_at"])
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/v1/auth/kyc/", self._submit_payload(), format="multipart"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resubmit_after_rejected(self):
        self.user.kyc_status = KycStatus.REJECTED
        self.user.kyc_rejection_reason = "Blurry photo"
        self.user.save(update_fields=["kyc_status", "kyc_rejection_reason", "updated_at"])
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/v1/auth/kyc/", self._submit_payload(), format="multipart"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.kyc_status, KycStatus.PENDING)
        self.assertEqual(self.user.kyc_rejection_reason, "")

    def test_admin_approve_and_download(self):
        self.user.kyc_status = KycStatus.PENDING
        self.user.kyc_doc = kyc_file()
        self.user.kyc_legal_name = "Jane Doe"
        self.user.save()
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f"/api/v1/admin/users/{self.user.id}/",
            {"kyc_status": KycStatus.VERIFIED},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.kyc_status, KycStatus.VERIFIED)
        doc = self.client.get(f"/api/v1/admin/users/{self.user.id}/kyc/document/")
        self.assertEqual(doc.status_code, status.HTTP_200_OK)

    def test_admin_cannot_change_kyc_when_not_pending(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f"/api/v1/admin/users/{self.user.id}/",
            {"kyc_status": KycStatus.VERIFIED},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_download_own_document(self):
        self.user.kyc_doc = kyc_file()
        self.user.save(update_fields=["kyc_doc", "updated_at"])
        self.client.force_authenticate(user=self.user)
        res = self.client.get("/api/v1/auth/kyc/document/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

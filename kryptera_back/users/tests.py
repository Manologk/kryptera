from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import User


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="test@example.com", password="testpass123", full_name="Test User"
        )

    def test_register(self):
        res = self.client.post("/api/v1/auth/register/", {
            "email": "new@example.com", "password": "newpass123",
            "password2": "newpass123", "full_name": "New User",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", res.data)
        self.assertIn("user", res.data)

    def test_register_password_mismatch(self):
        res = self.client.post("/api/v1/auth/register/", {
            "email": "x@x.com", "password": "pass1", "password2": "pass2",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login(self):
        res = self.client.post("/api/v1/auth/token/", {
            "email": "test@example.com", "password": "testpass123",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)

    def test_login_wrong_password(self):
        res = self.client.post("/api/v1/auth/token/", {
            "email": "test@example.com", "password": "wrong",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_me_authenticated(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get("/api/v1/auth/me/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["email"], "test@example.com")

    def test_me_unauthenticated(self):
        res = self.client.get("/api/v1/auth/me/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

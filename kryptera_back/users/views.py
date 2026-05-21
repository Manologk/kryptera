"""
users/views.py
"""
from django.http import FileResponse
from rest_framework import generics, permissions, status
from rest_framework.exceptions import NotFound
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .kyc import kyc_content_type, kyc_download_filename
from .models import User
from .serializers import (
    KycSubmitSerializer,
    LoginSerializer,
    RegisterSerializer,
    TokenPairSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/ — create a new user account."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = TokenPairSerializer.get_tokens(user)
        return Response(tokens, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST /api/v1/auth/token/ — obtain JWT tokens."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = TokenPairSerializer.get_tokens(serializer.validated_data["user"])
        return Response(tokens)


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/me/ — current user profile."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class KycSubmitView(APIView):
    """POST /api/v1/auth/kyc/ — submit identity document and metadata."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = KycSubmitSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class KycDocumentDownloadView(APIView):
    """GET /api/v1/auth/kyc/document/ — download own KYC document."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.kyc_doc or not str(user.kyc_doc).strip():
            raise NotFound("No identity document on file.")
        name = kyc_download_filename(user)
        fh = user.kyc_doc.open("rb")
        return FileResponse(
            fh,
            as_attachment=True,
            filename=name,
            content_type=kyc_content_type(name),
        )


def stream_user_kyc_document(user: User) -> FileResponse:
    if not user.kyc_doc or not str(user.kyc_doc).strip():
        raise NotFound("No identity document on file.")
    name = kyc_download_filename(user)
    fh = user.kyc_doc.open("rb")
    return FileResponse(
        fh,
        as_attachment=True,
        filename=name,
        content_type=kyc_content_type(name),
    )

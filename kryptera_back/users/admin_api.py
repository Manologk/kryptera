from rest_framework import filters, generics
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView

from rates.permissions import IsAdminUser

from .models import User
from .serializers import AdminUserSerializer
from .views import stream_user_kyc_document


class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all().order_by("-created_at")
    filter_backends = [filters.SearchFilter]
    search_fields = ["email", "full_name"]


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all()


class AdminUserKycDocumentView(APIView):
    """GET /api/v1/admin/users/<pk>/kyc/document/ — download user KYC document."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            raise NotFound("User not found.")
        return stream_user_kyc_document(user)

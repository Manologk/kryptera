from rest_framework import filters, generics

from rates.permissions import IsAdminUser

from .models import User
from .serializers import AdminUserSerializer


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

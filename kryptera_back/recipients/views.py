from rest_framework import permissions, viewsets

from .models import Recipient
from .serializers import RecipientSerializer


class RecipientViewSet(viewsets.ModelViewSet):
    """CRUD /api/v1/recipients/ — scoped to the authenticated sender only."""

    serializer_class = RecipientSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Recipient.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

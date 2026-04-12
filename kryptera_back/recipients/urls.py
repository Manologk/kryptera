from django.urls import path

from .views import RecipientViewSet

_list = RecipientViewSet.as_view({"get": "list", "post": "create"})
_detail = RecipientViewSet.as_view(
    {
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    }
)

urlpatterns = [
    path("", _list, name="recipient-list"),
    path("<int:pk>/", _detail, name="recipient-detail"),
]

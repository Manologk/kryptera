"""
config/urls.py — Root URL configuration
"""
from django.conf import settings
from django.contrib import admin
from django.conf.urls.static import static
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("config.api_urls")),
]

# User uploads (POP, receipts). In Docker, nginx usually serves /media/ from the volume; when using
# runserver / gunicorn directly (e.g. Vite proxy to :8000), Django must serve these files too.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

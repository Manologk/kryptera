"""KYC file validation shared by submit serializer."""
import mimetypes
import os

from rest_framework import serializers

KYC_MAX_MB = 10
KYC_ALLOWED_CONTENT_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
]


def validate_kyc_doc_file(value):
    max_bytes = KYC_MAX_MB * 1024 * 1024
    if value.size > max_bytes:
        raise serializers.ValidationError(
            f"File too large. Maximum size is {KYC_MAX_MB}MB."
        )
    if value.content_type not in KYC_ALLOWED_CONTENT_TYPES:
        raise serializers.ValidationError(
            "Only JPEG, PNG, WEBP, or PDF files are accepted."
        )
    return value


def kyc_download_filename(user) -> str:
    if not user.kyc_doc or not str(user.kyc_doc).strip():
        return "kyc-document"
    name = os.path.basename(str(user.kyc_doc.name).replace("\\", "/"))
    return name or "kyc-document"


def kyc_content_type(filename: str) -> str:
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or "application/octet-stream"

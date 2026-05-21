"""Safe email attachments from Django FileField values."""
from __future__ import annotations

import mimetypes
import os
from dataclasses import dataclass

from django.conf import settings
@dataclass
class PreparedAttachment:
    filename: str
    content: bytes
    mimetype: str


def prepare_file_field_attachment(file_field) -> tuple[PreparedAttachment | None, str | None]:
    """
    Read a FileField for email attach. Returns (attachment, warning_note).
    warning_note is set when the file is missing or too large.
    """
    if not file_field or not str(file_field).strip():
        return None, "No file was available to attach."

    name = os.path.basename(str(file_field.name).replace("\\", "/")) or "attachment"
    max_bytes = int(getattr(settings, "NOTIFICATION_MAX_ATTACHMENT_BYTES", 10 * 1024 * 1024))

    try:
        with file_field.open("rb") as fh:
            content = fh.read()
    except (FileNotFoundError, OSError):
        return None, f"File '{name}' could not be read from storage and was not attached."

    if len(content) > max_bytes:
        return None, f"File '{name}' exceeds the maximum attachment size and was not attached."

    mimetype, _ = mimetypes.guess_type(name)
    return PreparedAttachment(
        filename=name,
        content=content,
        mimetype=mimetype or "application/octet-stream",
    ), None

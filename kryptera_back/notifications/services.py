"""Build and send notification emails."""
from __future__ import annotations

import logging
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

from notifications.attachments import prepare_file_field_attachment
from notifications.utils import transaction_reference
from transactions.models import Transaction
from users.models import KycStatus, User

logger = logging.getLogger(__name__)


class NotificationConfigError(Exception):
    """Raised when email or admin notification settings are missing."""


def _ensure_smtp_configured() -> None:
    if not getattr(settings, "EMAIL_HOST", "").strip():
        raise NotificationConfigError("EMAIL_HOST is not configured.")


def get_admin_recipients() -> list[str]:
    emails = list(getattr(settings, "ADMIN_NOTIFICATION_EMAILS", []) or [])
    if not emails:
        raise NotificationConfigError(
            "ADMIN_NOTIFICATION_EMAILS is empty; cannot send admin notifications."
        )
    return emails


def _send_multipart(
    *,
    subject: str,
    to: list[str],
    template_base: str,
    context: dict,
    attachment=None,
) -> None:
    _ensure_smtp_configured()
    full_context = {**_base_email_context(), **context}
    text_body = render_to_string(f"notifications/emails/{template_base}.txt", full_context)
    html_body = render_to_string(f"notifications/emails/{template_base}.html", full_context)
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=to,
        reply_to=[settings.REPLY_TO_EMAIL] if getattr(settings, "REPLY_TO_EMAIL", None) else None,
    )
    msg.attach_alternative(html_body, "text/html")
    if attachment is not None:
        msg.attach(attachment.filename, attachment.content, attachment.mimetype)
    msg.send(fail_silently=False)


def _send_to_each_admin(*, subject: str, template_base: str, context: dict, attachment=None) -> int:
    count = 0
    for admin_email in get_admin_recipients():
        _send_multipart(
            subject=subject,
            to=[admin_email],
            template_base=template_base,
            context=context,
            attachment=attachment,
        )
        count += 1
    return count


def _base_email_context() -> dict:
    return {
        "company_name": "Kryptera",
        "support_email": getattr(settings, "REPLY_TO_EMAIL", "") or settings.DEFAULT_FROM_EMAIL,
    }


def _user_display_name(user: User) -> str:
    return (user.full_name or user.kyc_legal_name or user.email).strip()


def _format_submitted_at(dt) -> str:
    if not dt:
        return "—"
    return timezone.localtime(dt).strftime("%Y-%m-%d %H:%M UTC")


def _mode_label(mode: str) -> str:
    labels = {
        "russia-zambia": "Russia → Zambia",
        "zambia-russia": "Zambia → Russia",
    }
    return labels.get(mode, mode)


def _format_amount(value) -> str:
    if value is None:
        return "—"
    quantized = Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return f"{quantized:,.2f}"


def _kyc_context(user: User) -> dict:
    return {
        "user_id": user.pk,
        "user_email": user.email,
        "user_full_name": user.full_name or "—",
        "user_phone": user.phone or "—",
        "kyc_legal_name": user.kyc_legal_name or "—",
        "kyc_id_number": user.kyc_id_number or "—",
        "kyc_country": user.kyc_country or "—",
        "kyc_submitted_at": _format_submitted_at(user.kyc_submitted_at),
        "admin_users_url": f"{settings.FRONTEND_URL}/admin/users",
    }


def send_user_kyc_submitted(user: User) -> None:
    context = {
        "user_name": _user_display_name(user),
        "kyc_url": f"{settings.FRONTEND_URL}/kyc",
        "kyc_submitted_at": _format_submitted_at(user.kyc_submitted_at),
    }
    _send_multipart(
        subject="Kryptera — Identity verification received",
        to=[user.email],
        template_base="user_kyc_submitted",
        context=context,
    )


def send_admins_kyc_submitted(user: User) -> int:
    return _send_to_each_admin(
        subject=f"Kryptera — KYC submitted by {user.email}",
        template_base="admin_kyc_submitted",
        context=_kyc_context(user),
    )


def send_user_kyc_decision(user: User, *, new_status: str) -> None:
    if new_status == KycStatus.VERIFIED:
        template = "user_kyc_approved"
        subject = "Kryptera — Identity verification approved"
        context = {
            "user_name": _user_display_name(user),
            "home_url": settings.FRONTEND_URL,
        }
    elif new_status == KycStatus.REJECTED:
        template = "user_kyc_rejected"
        subject = "Kryptera — Identity verification update"
        context = {
            "user_name": _user_display_name(user),
            "kyc_url": f"{settings.FRONTEND_URL}/kyc",
            "rejection_reason": (user.kyc_rejection_reason or "").strip()
            or "Please resubmit with clearer documents.",
        }
    else:
        return

    _send_multipart(
        subject=subject,
        to=[user.email],
        template_base=template,
        context=context,
    )


def _transaction_context(tx: Transaction) -> dict:
    user = tx.user
    snap = tx.recipient_snapshot or {}
    return {
        "reference": transaction_reference(tx),
        "user_email": user.email if user else "—",
        "user_full_name": (user.full_name if user else None) or "—",
        "user_phone": (user.phone if user else None) or "—",
        "mode_label": _mode_label(tx.mode),
        "input_amount": _format_amount(tx.input_amount),
        "input_currency": tx.input_currency,
        "result_amount": _format_amount(tx.result_amount),
        "result_currency": tx.result_currency,
        "purpose": tx.purpose or "—",
        "delivery_method": tx.delivery_method or "—",
        "payment_method": tx.payment_method or "—",
        "recipient_name": snap.get("full_name") or "—",
        "admin_pending_url": f"{settings.FRONTEND_URL}/admin/pending/{tx.pk}",
        "activity_url": f"{settings.FRONTEND_URL}/activity/{tx.pk}",
    }


def send_admins_pop_uploaded(tx: Transaction) -> int:
    attachment, note = prepare_file_field_attachment(tx.pop_file)
    context = _transaction_context(tx)
    if note:
        context["attachment_note"] = note
    ref = transaction_reference(tx)
    return _send_to_each_admin(
        subject=f"Kryptera — Proof of payment uploaded ({ref})",
        template_base="admin_pop_uploaded",
        context=context,
        attachment=attachment,
    )


def send_user_transaction_completed(tx: Transaction) -> None:
    user = tx.user
    if not user or not user.email:
        logger.warning("Skipping completion email for transaction %s: no user email", tx.pk)
        return

    proof_field = tx.delivery_proof or tx.receipt_file
    attachment, note = prepare_file_field_attachment(proof_field)
    context = _transaction_context(tx)
    context["user_name"] = _user_display_name(user)
    context["admin_notes"] = (tx.admin_notes or "").strip() or None
    if note:
        context["attachment_note"] = note

    ref = transaction_reference(tx)
    _send_multipart(
        subject=f"Kryptera — Transfer completed ({ref})",
        to=[user.email],
        template_base="user_transaction_completed",
        context=context,
        attachment=attachment,
    )

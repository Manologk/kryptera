"""Schedule notification tasks after the DB transaction commits."""
from __future__ import annotations

import logging

from django.db import transaction

from notifications.services import NotificationConfigError
from notifications.tasks import (
    send_admins_kyc_submitted_task,
    send_admins_pop_uploaded_task,
    send_user_kyc_decision_task,
    send_user_kyc_submitted_task,
    send_user_transaction_completed_task,
)

logger = logging.getLogger(__name__)


def _on_commit(task, *args, **kwargs) -> None:
    transaction.on_commit(lambda: task.delay(*args, **kwargs))


def notify_user_kyc_submitted(user_id: int) -> None:
    _on_commit(send_user_kyc_submitted_task, user_id)


def notify_admins_kyc_submitted(user_id: int) -> None:
    try:
        from django.conf import settings

        if not getattr(settings, "ADMIN_NOTIFICATION_EMAILS", None):
            raise NotificationConfigError("ADMIN_NOTIFICATION_EMAILS is empty.")
    except NotificationConfigError as exc:
        logger.error("Admin KYC notification skipped: %s", exc)
        raise
    _on_commit(send_admins_kyc_submitted_task, user_id)


def notify_user_kyc_decision(user_id: int, new_status: str) -> None:
    _on_commit(send_user_kyc_decision_task, user_id, new_status)


def notify_admins_pop_uploaded(transaction_id) -> None:
    try:
        from django.conf import settings

        if not getattr(settings, "ADMIN_NOTIFICATION_EMAILS", None):
            raise NotificationConfigError("ADMIN_NOTIFICATION_EMAILS is empty.")
    except NotificationConfigError as exc:
        logger.error("Admin POP notification skipped: %s", exc)
        raise
    _on_commit(send_admins_pop_uploaded_task, str(transaction_id))


def notify_user_transaction_completed(transaction_id) -> None:
    _on_commit(send_user_transaction_completed_task, str(transaction_id))

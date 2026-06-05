"""Schedule notification tasks after the DB transaction commits."""
from __future__ import annotations

import logging

from django.conf import settings
from django.db import transaction

from notifications.tasks import (
    send_admins_kyc_submitted_task,
    send_admins_pop_uploaded_task,
    send_user_kyc_decision_task,
    send_user_kyc_submitted_task,
    send_user_transaction_completed_task,
)

logger = logging.getLogger(__name__)


def _admin_notifications_enabled() -> bool:
    return bool(getattr(settings, "ADMIN_NOTIFICATION_EMAILS", None))


def _on_commit(task, *args, **kwargs) -> None:
    def _enqueue() -> None:
        try:
            task.delay(*args, **kwargs)
        except Exception:
            logger.exception(
                "Failed to enqueue notification task %s; request already succeeded",
                getattr(task, "name", task),
            )

    transaction.on_commit(_enqueue)


def notify_user_kyc_submitted(user_id: int) -> None:
    _on_commit(send_user_kyc_submitted_task, user_id)


def notify_admins_kyc_submitted(user_id: int) -> None:
    if not _admin_notifications_enabled():
        logger.warning(
            "Admin KYC notification skipped: ADMIN_NOTIFICATION_EMAILS is empty."
        )
        return
    _on_commit(send_admins_kyc_submitted_task, user_id)


def notify_user_kyc_decision(user_id: int, new_status: str) -> None:
    _on_commit(send_user_kyc_decision_task, user_id, new_status)


def notify_admins_pop_uploaded(transaction_id) -> None:
    if not _admin_notifications_enabled():
        logger.warning(
            "Admin POP notification skipped: ADMIN_NOTIFICATION_EMAILS is empty."
        )
        return
    _on_commit(send_admins_pop_uploaded_task, str(transaction_id))


def notify_user_transaction_completed(transaction_id) -> None:
    _on_commit(send_user_transaction_completed_task, str(transaction_id))

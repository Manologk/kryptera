"""Celery tasks for async email delivery."""
from __future__ import annotations

import logging
import smtplib

from celery import shared_task

from notifications import services
from transactions.models import Transaction
from users.models import User

logger = logging.getLogger(__name__)

_RETRY_EXCEPTIONS = (
    smtplib.SMTPException,
    smtplib.SMTPServerDisconnected,
    smtplib.SMTPConnectError,
    OSError,
    ConnectionError,
    TimeoutError,
)


@shared_task(
    bind=True,
    autoretry_for=_RETRY_EXCEPTIONS,
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    name="notifications.send_user_kyc_submitted",
)
def send_user_kyc_submitted_task(self, user_id: int) -> None:
    user = User.objects.get(pk=user_id)
    services.send_user_kyc_submitted(user)


@shared_task(
    bind=True,
    autoretry_for=_RETRY_EXCEPTIONS,
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    name="notifications.send_admins_kyc_submitted",
)
def send_admins_kyc_submitted_task(self, user_id: int) -> int:
    user = User.objects.get(pk=user_id)
    return services.send_admins_kyc_submitted(user)


@shared_task(
    bind=True,
    autoretry_for=_RETRY_EXCEPTIONS,
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    name="notifications.send_user_kyc_decision",
)
def send_user_kyc_decision_task(self, user_id: int, new_status: str) -> None:
    user = User.objects.get(pk=user_id)
    services.send_user_kyc_decision(user, new_status=new_status)


@shared_task(
    bind=True,
    autoretry_for=_RETRY_EXCEPTIONS,
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    name="notifications.send_admins_pop_uploaded",
)
def send_admins_pop_uploaded_task(self, transaction_id: str) -> int:
    tx = Transaction.objects.select_related("user").get(pk=transaction_id)
    return services.send_admins_pop_uploaded(tx)


@shared_task(
    bind=True,
    autoretry_for=_RETRY_EXCEPTIONS,
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    name="notifications.send_user_transaction_completed",
)
def send_user_transaction_completed_task(self, transaction_id: str) -> None:
    tx = Transaction.objects.select_related("user").get(pk=transaction_id)
    services.send_user_transaction_completed(tx)

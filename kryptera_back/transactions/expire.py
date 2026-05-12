"""Auto-expire transfers when the proof upload window passes without a POP file."""
from __future__ import annotations

from django.db.models import Q
from django.utils import timezone

from .models import Transaction, TransactionStatus


def cancel_expired_finish_later_transactions() -> int:
    """
    Mark pending finish-later transfers as canceled when payment_deadline has passed.
    Returns the number of rows updated.
    """
    now = timezone.now()
    return Transaction.objects.filter(
        status=TransactionStatus.PENDING,
        finish_later=True,
        payment_deadline__isnull=False,
        payment_deadline__lt=now,
    ).update(status=TransactionStatus.CANCELED, updated_at=now)


def expire_transaction_if_due(tx: Transaction) -> bool:
    """
    If the row is still awaiting a first POP and a deadline has passed, set status to canceled.
    Returns True if the instance was updated (caller may need to refresh from DB).
    """
    if tx.status not in (TransactionStatus.PENDING, TransactionStatus.POP_NOT_UPLOADED):
        return False
    if tx.pop_file and str(tx.pop_file).strip():
        return False
    now = timezone.now()

    if (
        tx.status == TransactionStatus.PENDING
        and tx.finish_later
        and tx.payment_deadline is not None
        and tx.payment_deadline <= now
    ):
        tx.status = TransactionStatus.CANCELED
        tx.save(update_fields=["status", "updated_at"])
        return True

    if tx.proof_deadline_at is None:
        return False
    if tx.proof_deadline_at > now:
        return False
    tx.status = TransactionStatus.CANCELED
    tx.save(update_fields=["status", "updated_at"])
    return True


def expire_stale_transactions_for_user(user_id) -> None:
    """Bulk-expire overdue payment windows for one user (e.g. before listing)."""
    now = timezone.now()
    cancel_expired_finish_later_transactions()
    Transaction.objects.filter(
        user_id=user_id,
        proof_deadline_at__isnull=False,
        proof_deadline_at__lte=now,
        status__in=(TransactionStatus.PENDING, TransactionStatus.POP_NOT_UPLOADED),
    ).filter(Q(pop_file__isnull=True) | Q(pop_file="")).update(
        status=TransactionStatus.CANCELED,
        updated_at=now,
    )

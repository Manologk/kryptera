from celery import shared_task

from .expire import cancel_expired_finish_later_transactions


@shared_task(name="transactions.cancel_expired_transactions")
def cancel_expired_transactions_task() -> int:
    """Periodic task — cancel pending finish-later transfers past payment_deadline."""
    return cancel_expired_finish_later_transactions()

from django.core.management.base import BaseCommand

from transactions.expire import cancel_expired_finish_later_transactions


class Command(BaseCommand):
    help = (
        "Set status to canceled for pending transactions with finish_later=True "
        "whose payment_deadline is in the past."
    )

    def handle(self, *args, **options):
        count = cancel_expired_finish_later_transactions()
        self.stdout.write(self.style.SUCCESS(f"Updated {count} transaction(s) to canceled."))

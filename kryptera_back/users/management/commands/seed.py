"""
python manage.py seed — Seed the database with dev fixtures.
Safe to run multiple times (idempotent).
"""
import os
from decimal import Decimal

from django.core.management.base import BaseCommand

from rates.models import ExchangeRate, RateAuditLog
from users.models import User


class Command(BaseCommand):
    help = "Seed database with dev fixtures"

    def handle(self, *args, **options):
        # ── Admin user ─────────────────────────────────────────────────────
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@cryptoflux.local")
        admin_pass  = os.environ.get("ADMIN_PASSWORD", "admin123")

        admin, created = User.objects.get_or_create(email=admin_email)
        if created or not admin.has_usable_password():
            admin.set_password(admin_pass)
        admin.is_admin    = True
        admin.is_staff    = True
        admin.is_superuser = True
        admin.full_name   = "CryptoFlux Admin"
        admin.save()
        self.stdout.write(self.style.SUCCESS(
            f"{'Created' if created else 'Updated'} admin: {admin_email}"
        ))

        # ── Exchange rates ─────────────────────────────────────────────────
        rate = ExchangeRate.load()
        if rate.ruble_to_usd_buying == 0:
            rate.ruble_to_usd_buying   = Decimal("95.5")
            rate.usd_to_kwacha_selling = Decimal("27.5")
            rate.kwacha_to_usd_buying  = Decimal("28.0")
            rate.usd_to_ruble_selling  = Decimal("96.0")
            rate.updated_by = admin
            rate.save()
            RateAuditLog.objects.create(
                changed_by=admin,
                ruble_to_usd_buying=rate.ruble_to_usd_buying,
                usd_to_kwacha_selling=rate.usd_to_kwacha_selling,
                kwacha_to_usd_buying=rate.kwacha_to_usd_buying,
                usd_to_ruble_selling=rate.usd_to_ruble_selling,
            )
            self.stdout.write(self.style.SUCCESS("Seeded default exchange rates"))
        else:
            self.stdout.write("Exchange rates already set — skipping")

        self.stdout.write(self.style.SUCCESS("\nSeed complete ✓"))

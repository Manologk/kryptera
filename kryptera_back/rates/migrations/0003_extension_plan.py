# Generated manually for plan.md extension

import django.db.models.deletion
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


def seed_currencies_and_quotes(apps, schema_editor):
    Currency = apps.get_model("rates", "Currency")
    ExchangeRate = apps.get_model("rates", "ExchangeRate")
    ExchangeRateQuote = apps.get_model("rates", "ExchangeRateQuote")

    seeds = [
        ("RUB", "Russian Ruble", "₽", "🇷🇺", 1),
        ("ZMW", "Zambian Kwacha", "ZK", "🇿🇲", 2),
        ("USD", "US Dollar", "$", "🇺🇸", 3),
    ]
    for code, name, symbol, flag, order in seeds:
        Currency.objects.get_or_create(
            code=code,
            defaults={
                "name": name,
                "symbol": symbol,
                "flag_emoji": flag,
                "is_enabled": True,
                "sort_order": order,
            },
        )

    er = ExchangeRate.objects.filter(pk=1).first()
    rub = er.ruble_to_usd_buying if er else Decimal("0")
    usd_zmw = er.usd_to_kwacha_selling if er else Decimal("0")
    zmw_usd = er.kwacha_to_usd_buying if er else Decimal("0")
    usd_rub = er.usd_to_ruble_selling if er else Decimal("0")

    mapping = [
        ("rub_usd_buy", rub),
        ("usd_zmw_sell", usd_zmw),
        ("zmw_usd_buy", zmw_usd),
        ("usd_rub_sell", usd_rub),
    ]
    for slug, rate in mapping:
        ExchangeRateQuote.objects.get_or_create(
            slug=slug,
            defaults={"rate": rate, "is_active": True},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("rates", "0002_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Currency",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(db_index=True, max_length=3, unique=True)),
                ("name", models.CharField(max_length=128)),
                ("symbol", models.CharField(blank=True, max_length=8)),
                ("flag_emoji", models.CharField(blank=True, max_length=16)),
                ("is_enabled", models.BooleanField(default=True)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Currency",
                "verbose_name_plural": "Currencies",
                "ordering": ["sort_order", "code"],
            },
        ),
        migrations.CreateModel(
            name="ExchangeRateQuote",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug", models.SlugField(db_index=True, max_length=32, unique=True)),
                ("rate", models.DecimalField(decimal_places=6, default=0, max_digits=18)),
                ("is_active", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="quote_updates",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["slug"],
            },
        ),
        migrations.CreateModel(
            name="RateQuoteAuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug", models.SlugField(db_index=True, max_length=32)),
                ("old_rate", models.DecimalField(decimal_places=6, max_digits=18)),
                ("new_rate", models.DecimalField(decimal_places=6, max_digits=18)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "changed_by",
                    models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.RunPython(seed_currencies_and_quotes, migrations.RunPython.noop),
    ]

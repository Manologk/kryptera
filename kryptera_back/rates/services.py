"""
rates/services.py — Effective rates from quote rows + singleton sync helpers.
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from django.db import transaction

# Stable slugs ↔ legacy ExchangeRate column names
SLUG_TO_FIELD: dict[str, str] = {
    "rub_usd_buy": "ruble_to_usd_buying",
    "usd_zmw_sell": "usd_to_kwacha_selling",
    "zmw_usd_buy": "kwacha_to_usd_buying",
    "usd_rub_sell": "usd_to_ruble_selling",
}
FIELD_TO_SLUG: dict[str, str] = {v: k for k, v in SLUG_TO_FIELD.items()}
ORDERED_SLUGS: tuple[str, ...] = tuple(SLUG_TO_FIELD.keys())


def _decimal_fields_zero(data: dict[str, Decimal]) -> bool:
    return all(data.get(f, Decimal("0")) == 0 for f in SLUG_TO_FIELD.values())


def effective_rates() -> dict[str, Any]:
    """
    Values used for conversion and GET /rates/.
    Keys: ruble_to_usd_buying, usd_to_kwacha_selling, kwacha_to_usd_buying, usd_to_ruble_selling, updated_at.
    """
    from .models import ExchangeRate, ExchangeRateQuote

    out: dict[str, Decimal] = {f: Decimal("0") for f in SLUG_TO_FIELD.values()}
    latest: datetime | None = None

    for q in ExchangeRateQuote.objects.filter(is_active=True, slug__in=ORDERED_SLUGS):
        field = SLUG_TO_FIELD.get(q.slug)
        if field:
            out[field] = q.rate
            if latest is None or q.updated_at > latest:
                latest = q.updated_at

    if _decimal_fields_zero(out):
        er = ExchangeRate.objects.filter(pk=1).first()
        if er:
            for field in SLUG_TO_FIELD.values():
                out[field] = getattr(er, field)
            latest = er.updated_at

    return {
        **out,
        "updated_at": latest,
    }


def snapshot_rates_dict() -> dict[str, str]:
    """String snapshot for JSONField on Transaction."""
    d = effective_rates()
    return {
        "ruble_to_usd_buying": str(d["ruble_to_usd_buying"]),
        "usd_to_kwacha_selling": str(d["usd_to_kwacha_selling"]),
        "kwacha_to_usd_buying": str(d["kwacha_to_usd_buying"]),
        "usd_to_ruble_selling": str(d["usd_to_ruble_selling"]),
    }


def sync_singleton_from_quotes_db(updated_by=None) -> None:
    """Update ExchangeRate id=1 from active quote rows (no audit rows)."""
    from .models import ExchangeRate, ExchangeRateQuote

    quotes = {q.slug: q.rate for q in ExchangeRateQuote.objects.filter(is_active=True)}
    er, _ = ExchangeRate.objects.get_or_create(pk=1)
    for slug, field in SLUG_TO_FIELD.items():
        setattr(er, field, quotes.get(slug, Decimal("0")))
    if updated_by is not None:
        er.updated_by = updated_by
    er.save()


def sync_quotes_from_singleton() -> None:
    """Upsert active quotes from ExchangeRate id=1 (tests / legacy writes to singleton)."""
    from .models import ExchangeRate, ExchangeRateQuote

    er = ExchangeRate.objects.filter(pk=1).first()
    if not er:
        return
    for slug, field in SLUG_TO_FIELD.items():
        q, _ = ExchangeRateQuote.objects.get_or_create(
            slug=slug,
            defaults={"rate": getattr(er, field), "is_active": True},
        )
        q.rate = getattr(er, field)
        q.is_active = True
        q.save(update_fields=["rate", "is_active", "updated_at"])


def persist_rates_from_request(
    *,
    ruble_to_usd_buying: Decimal,
    usd_to_kwacha_selling: Decimal,
    kwacha_to_usd_buying: Decimal,
    usd_to_ruble_selling: Decimal,
    user,
) -> None:
    """
    Update quote rows, sync singleton row, append legacy RateAuditLog + per-quote audit rows.
    """
    from .models import ExchangeRate, ExchangeRateQuote, RateAuditLog, RateQuoteAuditLog

    field_values = {
        "ruble_to_usd_buying": ruble_to_usd_buying,
        "usd_to_kwacha_selling": usd_to_kwacha_selling,
        "kwacha_to_usd_buying": kwacha_to_usd_buying,
        "usd_to_ruble_selling": usd_to_ruble_selling,
    }

    with transaction.atomic():
        for slug, field in SLUG_TO_FIELD.items():
            new_rate = field_values[field]
            q = (
                ExchangeRateQuote.objects.select_for_update()
                .filter(slug=slug)
                .first()
            )
            if q is None:
                old = Decimal("0")
                q = ExchangeRateQuote(slug=slug, rate=new_rate, is_active=True, updated_by=user)
                q.save()
            else:
                old = q.rate
                if old != new_rate:
                    RateQuoteAuditLog.objects.create(
                        changed_by=user,
                        slug=slug,
                        old_rate=old,
                        new_rate=new_rate,
                    )
                q.rate = new_rate
                q.is_active = True
                q.updated_by = user
                q.save()

        er, _ = ExchangeRate.objects.select_for_update().get_or_create(pk=1)
        er.ruble_to_usd_buying = ruble_to_usd_buying
        er.usd_to_kwacha_selling = usd_to_kwacha_selling
        er.kwacha_to_usd_buying = kwacha_to_usd_buying
        er.usd_to_ruble_selling = usd_to_ruble_selling
        er.updated_by = user
        er.save()

        RateAuditLog.objects.create(
            changed_by=user,
            ruble_to_usd_buying=ruble_to_usd_buying,
            usd_to_kwacha_selling=usd_to_kwacha_selling,
            kwacha_to_usd_buying=kwacha_to_usd_buying,
            usd_to_ruble_selling=usd_to_ruble_selling,
        )

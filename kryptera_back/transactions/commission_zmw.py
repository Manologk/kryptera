"""Derive commission fee in ZMW from stored transaction + rate snapshot."""
from __future__ import annotations

from decimal import Decimal, InvalidOperation

from .models import Currency, Transaction


def commission_amount_zmw(tx: Transaction) -> Decimal:
    """
    Commission (input_amount × commission_rate) expressed in ZMW using booking-time FX.
    RUB-denominated fees use ruble_to_usd_buying and usd_to_kwacha_selling from rate_snapshot.
    ZMW-denominated fees are already in ZMW.
    """
    try:
        fee_in_input = tx.input_amount * tx.commission_rate
    except (TypeError, ValueError, InvalidOperation):
        return Decimal("0")

    if tx.input_currency == Currency.ZMW:
        return fee_in_input.quantize(Decimal("0.000001"))

    snap = tx.rate_snapshot or {}
    try:
        rub_usd = Decimal(str(snap.get("ruble_to_usd_buying", "0")))
        usd_zmw = Decimal(str(snap.get("usd_to_kwacha_selling", "0")))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")

    if rub_usd <= 0 or usd_zmw <= 0:
        return Decimal("0")
    return (fee_in_input / rub_usd * usd_zmw).quantize(Decimal("0.000001"))

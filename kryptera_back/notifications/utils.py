"""Shared helpers for notification content."""
from __future__ import annotations

from transactions.models import Transaction


def transaction_reference(tx: Transaction) -> str:
    hx = str(tx.pk).replace("-", "")[:8].upper()
    return f"KRP-{hx}"

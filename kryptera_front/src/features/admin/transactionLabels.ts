import type { Transaction, TransactionStatus } from '@/types';

export const TRANSACTION_STATUS_FILTER_OPTIONS: { value: TransactionStatus; label: string }[] = [
  { value: 'pop_not_uploaded', label: 'Awaiting POP' },
  { value: 'pending_verification', label: 'Pending verification' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Declined' },
  { value: 'canceled', label: 'Canceled' },
];

const EXTRA_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  awaiting_confirmation: 'Awaiting confirmation',
};

export function transactionStatusLabel(status: TransactionStatus | string): string {
  const key = String(status);
  const hit = TRANSACTION_STATUS_FILTER_OPTIONS.find(o => o.value === key);
  if (hit) return hit.label;
  if (EXTRA_STATUS_LABELS[key] != null) return EXTRA_STATUS_LABELS[key];
  return key.replace(/_/g, ' ');
}

export function recipientDisplay(tx: Transaction): string {
  if (tx.recipient) {
    return tx.recipient.fullName || '—';
  }
  const s = tx.recipientSnapshot;
  if (s) {
    const name = s.full_name ?? s.email ?? s.phone_number ?? s.phone;
    return name || '—';
  }
  return '—';
}

/** Phone for table secondary line; empty string if none. */
export function recipientPhoneLine(tx: Transaction): string {
  const r = tx.recipient;
  const s = tx.recipientSnapshot;
  const raw = r?.phoneNumber ?? s?.phone_number ?? s?.phone ?? '';
  return raw.trim();
}

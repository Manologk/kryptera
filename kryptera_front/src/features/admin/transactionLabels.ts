import type { Transaction, TransactionStatus } from '@/types';

export const TRANSACTION_STATUS_FILTER_OPTIONS: { value: TransactionStatus; label: string }[] = [
  { value: 'pop_not_uploaded', label: 'Awaiting POP' },
  { value: 'pending_verification', label: 'Pending verification' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Declined' },
];

export function transactionStatusLabel(status: TransactionStatus | string): string {
  const hit = TRANSACTION_STATUS_FILTER_OPTIONS.find(o => o.value === status);
  return hit?.label ?? String(status).replace(/_/g, ' ');
}

export function recipientDisplay(tx: Transaction): string {
  if (tx.recipient) {
    const parts = [tx.recipient.label, tx.recipient.fullName].filter(Boolean);
    return parts.length ? parts.join(' · ') : '—';
  }
  const s = tx.recipientSnapshot;
  if (s) {
    const name = s.full_name ?? s.label ?? s.email ?? s.phone;
    return name || '—';
  }
  return '—';
}

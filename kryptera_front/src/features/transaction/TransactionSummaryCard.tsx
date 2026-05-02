import { StatusBadge } from '@/components/ui/Badge'
import { transactionReferenceDisplay } from '@/features/transaction/transactionReference'
import { formatMoneyAmount } from '@/features/transaction/utils'
import type { Transaction } from '@/types'

function recipientPhone(tx: Transaction): string {
  const r = tx.recipient
  const s = tx.recipientSnapshot
  const raw = r?.phoneNumber ?? s?.phone_number ?? s?.phone ?? ''
  return raw.trim() !== '' ? raw : '—'
}

function recipientName(tx: Transaction): string {
  return tx.recipient?.fullName?.trim() || tx.recipientSnapshot?.full_name?.trim() || '—'
}

export default function TransactionSummaryCard({ tx }: { tx: Transaction }) {
  const refDisplay = transactionReferenceDisplay(tx)
  const rows = [
    {
      label: 'Amount',
      value: formatMoneyAmount(tx.resultAmount, tx.resultCurrency),
      mono: false,
    },
    { label: 'Recipient', value: recipientName(tx), mono: false },
    { label: 'Phone', value: recipientPhone(tx), mono: false },
    { label: 'Reference', value: refDisplay, mono: true },
  ] as const

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#EBEBEB] bg-white p-0">
      {rows.map(row => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3 border-b border-[#EBEBEB]"
          style={{ padding: '12px 16px' }}
        >
          <span
            className="shrink-0 text-[12px] font-medium"
            style={{ color: 'var(--kryptera-muted)' }}
          >
            {row.label}
          </span>
          <span
            className={`text-right text-[14px] font-medium text-[#163300] ${row.mono ? 'font-mono' : ''}`}
          >
            {row.value}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3" style={{ padding: '12px 16px' }}>
        <span className="text-[12px] font-medium" style={{ color: 'var(--kryptera-muted)' }}>
          Status
        </span>
        <StatusBadge status={tx.status} />
      </div>
    </div>
  )
}

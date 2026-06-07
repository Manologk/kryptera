import { StatusBadge } from '@/components/ui/badge'
import { getDeliveryMethodTitle } from '@/constants/transferPlaceholders'
import { senderDisplay, senderSecondaryLine } from '@/features/admin/transactionLabels'
import { recipientPayoutDetailRows, recipientReceiveMethod } from '@/features/recipient/deliveryDetails'
import { transactionReferenceDisplay } from '@/features/transaction/transactionReference'
import { formatMoneyAmount } from '@/features/transaction/utils'
import type { Transaction } from '@/types'

function recipientName(tx: Transaction): string {
  return tx.recipient?.fullName?.trim() || tx.recipientSnapshot?.full_name?.trim() || '—'
}

function senderValue(tx: Transaction): string {
  const primary = senderDisplay(tx)
  const secondary = senderSecondaryLine(tx)
  return secondary ? `${primary} (${secondary})` : primary
}

export default function TransactionSummaryCard({ tx }: { tx: Transaction }) {
  const refDisplay = transactionReferenceDisplay(tx)
  const receiveMethod = recipientReceiveMethod(tx)
  const payoutRows = recipientPayoutDetailRows(tx)
  const rows = [
    { label: 'Sender', value: senderValue(tx), mono: false },
    {
      label: 'Amount',
      value: `${formatMoneyAmount(tx.inputAmount, tx.inputCurrency)} → ${formatMoneyAmount(tx.resultAmount, tx.resultCurrency)}`,
      mono: false,
    },
    { label: 'Recipient', value: recipientName(tx), mono: false },
    {
      label: 'Receive via',
      value: receiveMethod ? getDeliveryMethodTitle(receiveMethod) : '—',
      mono: false,
    },
    ...payoutRows.map(row => ({ ...row, mono: row.label === 'Account number' })),
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

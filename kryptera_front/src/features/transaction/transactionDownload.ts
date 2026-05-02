import { transactionReferenceDisplay } from '@/features/transaction/transactionReference'
import { formatMoneyAmount } from '@/features/transaction/utils'
import type { Transaction } from '@/types'

/** Client-side export of visible transaction fields as a text file (no API). */
export function downloadTransactionRecordText(tx: Transaction): void {
  const ref = transactionReferenceDisplay(tx)
  const body = [
    `Transaction ${ref}`,
    `Amount: ${formatMoneyAmount(tx.inputAmount, tx.inputCurrency)} → ${formatMoneyAmount(tx.resultAmount, tx.resultCurrency)}`,
    `Status: ${tx.status}`,
    `Created: ${tx.createdAt}`,
  ].join('\n')
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transaction-${String(tx.id).slice(0, 8)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

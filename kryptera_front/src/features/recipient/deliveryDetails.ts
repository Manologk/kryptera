import type { DeliveryOptionId } from '@/constants/transferPlaceholders'
import type { Transaction } from '@/types'

export type DeliveryDetailFields = {
  wallet: string
  bankName: string
  accountNumber: string
  cashNotes: string
}

export const emptyDeliveryDetailFields = (): DeliveryDetailFields => ({
  wallet: '',
  bankName: '',
  accountNumber: '',
  cashNotes: '',
})

/** Contact phone: use explicit phone, or mobile-money wallet when that method is selected. */
export function resolveRecipientPhoneNumber(
  phone: string,
  method: DeliveryOptionId | null | '',
  details: DeliveryDetailFields,
): string | undefined {
  const trimmed = phone.trim()
  if (trimmed) return trimmed
  if (method === 'mobile_money') {
    const wallet = details.wallet.trim()
    return wallet || undefined
  }
  return undefined
}

/** Build API payload for `delivery_details` from inline form fields. */
export function buildDeliveryDetailsPayload(
  method: DeliveryOptionId,
  d: DeliveryDetailFields,
): Record<string, string> {
  switch (method) {
    case 'mobile_money':
      return { wallet_number: d.wallet.trim() }
    case 'bank_deposit':
      return {
        bank_name: d.bankName.trim(),
        account_number: d.accountNumber.trim(),
      }
    case 'cash_pickup':
      return { location_notes: d.cashNotes.trim() }
    default:
      return {}
  }
}

/** Validate that required detail fields for the chosen method are filled. */
export function validateDeliveryDetails(
  method: DeliveryOptionId | null,
  d: DeliveryDetailFields,
): string | null {
  if (!method) return 'Choose how this contact receives funds.'
  if (method === 'mobile_money') {
    if (!d.wallet.trim()) return 'Enter the mobile money wallet number.'
    return null
  }
  if (method === 'bank_deposit') {
    if (!d.bankName.trim()) return 'Enter the bank name.'
    if (!d.accountNumber.trim()) return 'Enter the account number.'
    return null
  }
  if (method === 'cash_pickup') {
    if (!d.cashNotes.trim()) return 'Add pickup or location notes.'
    return null
  }
  return null
}

/** Populate inline fields when editing a saved recipient. */
export function fieldsFromStoredDetails(
  method: string | undefined,
  details: Record<string, unknown> | undefined,
): DeliveryDetailFields {
  const d = details ?? {}
  const str = (k: string) => (d[k] != null ? String(d[k]) : '')
  if (method === 'mobile_money') {
    return { wallet: str('wallet_number'), bankName: '', accountNumber: '', cashNotes: '' }
  }
  if (method === 'bank_deposit') {
    return {
      wallet: '',
      bankName: str('bank_name'),
      accountNumber: str('account_number'),
      cashNotes: '',
    }
  }
  if (method === 'cash_pickup') {
    return { wallet: '', bankName: '', accountNumber: '', cashNotes: str('location_notes') }
  }
  return emptyDeliveryDetailFields()
}

/** How the recipient receives funds (saved contact, snapshot, or transfer row). */
export function recipientReceiveMethod(tx: Transaction): string | undefined {
  const fromRecipient = tx.recipient?.deliveryMethod?.trim()
  if (fromRecipient) return fromRecipient
  const fromSnapshot = tx.recipientSnapshot?.delivery_method?.trim()
  if (fromSnapshot) return fromSnapshot
  return tx.deliveryMethod?.trim() || undefined
}

function deliveryDetailsFromTransaction(tx: Transaction): Record<string, unknown> {
  if (tx.recipient?.deliveryDetails && Object.keys(tx.recipient.deliveryDetails).length > 0) {
    return tx.recipient.deliveryDetails
  }
  const raw = tx.recipientSnapshot?.delivery_details
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return typeof parsed === 'object' && parsed != null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {}
    } catch {
      return {}
    }
  }
  return {}
}

/** Admin/detail rows for recipient payout info based on delivery method. */
export function recipientPayoutDetailRows(tx: Transaction): { label: string; value: string }[] {
  const method = recipientReceiveMethod(tx)
  const details = deliveryDetailsFromTransaction(tx)

  if (method === 'bank_deposit') {
    const rows: { label: string; value: string }[] = []
    const bank = String(details.bank_name ?? '').trim()
    const account = String(details.account_number ?? '').trim()
    if (bank) rows.push({ label: 'Bank', value: bank })
    if (account) rows.push({ label: 'Account number', value: account })
    if (!rows.length) rows.push({ label: 'Bank details', value: '—' })
    return rows
  }

  if (method === 'mobile_money') {
    const wallet = String(details.wallet_number ?? '').trim()
    const phone =
      tx.recipient?.phoneNumber?.trim() || tx.recipientSnapshot?.phone_number?.trim() || ''
    return [{ label: 'Mobile money number', value: wallet || phone || '—' }]
  }

  if (method === 'cash_pickup') {
    const notes = String(details.location_notes ?? '').trim()
    return [{ label: 'Pickup notes', value: notes || '—' }]
  }

  const phone =
    tx.recipient?.phoneNumber?.trim() || tx.recipientSnapshot?.phone_number?.trim() || ''
  if (phone) return [{ label: 'Phone', value: phone }]
  return []
}

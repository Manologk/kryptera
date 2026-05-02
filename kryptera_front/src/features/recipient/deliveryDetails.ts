import type { DeliveryOptionId } from '@/constants/transferPlaceholders'

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

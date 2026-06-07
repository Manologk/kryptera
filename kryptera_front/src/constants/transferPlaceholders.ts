import { CONTACT_INFO } from '@/constants'
import type { ConversionMode } from '@/types'

/** Placeholder payout channels — business will replace with real config later */
export const DELIVERY_OPTIONS = [
  {
    id: 'bank_deposit' as const,
    title: 'Bank deposit',
    description: 'Money is deposited into the recipient’s bank account.',
  },
  {
    id: 'mobile_money' as const,
    title: 'Mobile money',
    description: 'Funds go to the recipient’s mobile wallet.',
  },
  {
    id: 'cash_pickup' as const,
    title: 'Cash pickup',
    description: 'The recipient collects cash at a partner location.',
  },
]

/** Recipient payout methods available when saving a contact (mobile money default + bank). */
export const RECIPIENT_DELIVERY_OPTIONS = DELIVERY_OPTIONS.filter(
  o => o.id === 'mobile_money' || o.id === 'bank_deposit',
)

/** Russia → Zambia: mobile money (default) or bank; Zambia → Russia: bank deposit */
export const getDeliveryOptionsForCorridor = (mode: ConversionMode) =>
  mode === 'russia-zambia'
    ? RECIPIENT_DELIVERY_OPTIONS
    : DELIVERY_OPTIONS.filter(o => o.id === 'bank_deposit')

export const PAYMENT_OPTIONS_ZAM_RUS = [
  {
    id: 'pay_mobile_money' as const,
    title: 'Mobile money',
    description: 'Pay Kryptera using mobile money — instructions appear after you select.',
  },
  {
    id: 'pay_crypto_usdt' as const,
    title: 'Crypto (USDT)',
    description: 'Send USDT to Kryptera’s wallet — address and network shown below.',
  },
] as const

/** Russia → Zambia: pay via Russian bank or USDT */
export const PAYMENT_OPTIONS_RUS_ZAM = [
  {
    id: 'pay_bank_ru' as const,
    title: 'Bank',
    description: 'Transfer in rubles to the account below — details appear after you select.',
  },
  {
    id: 'pay_crypto_usdt' as const,
    title: 'Crypto (USDT)',
    description: 'Send USDT to Kryptera’s wallet — address and network shown below.',
  },
] as const

/** @deprecated Prefer PAYMENT_OPTIONS_ZAM_RUS or getPaymentOptionsForCorridor — kept for imports that mean ZAM→RUS */
export const PAYMENT_OPTIONS = [...PAYMENT_OPTIONS_ZAM_RUS]

export const getPaymentOptionsForCorridor = (mode: ConversionMode) =>
  mode === 'russia-zambia' ? [...PAYMENT_OPTIONS_RUS_ZAM] : [...PAYMENT_OPTIONS_ZAM_RUS]

export type DeliveryOptionId = (typeof DELIVERY_OPTIONS)[number]['id']
export type PaymentOptionId =
  | (typeof PAYMENT_OPTIONS_ZAM_RUS)[number]['id']
  | (typeof PAYMENT_OPTIONS_RUS_ZAM)[number]['id']

const PAYMENT_TITLE_BY_ID: Record<PaymentOptionId, string> = {
  pay_mobile_money: 'Mobile money',
  pay_crypto_usdt: 'Crypto (USDT)',
  pay_bank_ru: 'Bank',
}

export const getPaymentMethodTitle = (id: string | undefined): string => {
  if (!id) return '—'
  if (id in PAYMENT_TITLE_BY_ID) return PAYMENT_TITLE_BY_ID[id as PaymentOptionId]
  return id
}

export const getDeliveryMethodTitle = (id: string | undefined): string => {
  if (!id) return '—'
  return DELIVERY_OPTIONS.find(o => o.id === id)?.title ?? id
}

/** Instructions shown after choosing sender payment method (Zambia → Russia) */
export const KRYPTERA_PAY_MOBILE_MONEY = {
  number: CONTACT_INFO.phone,
  displayNumber: CONTACT_INFO.phone,
  instructions: [
    'Open your mobile money app and send only the amount shown on the next screen (when available).',
    `Use this number as the recipient: ${CONTACT_INFO.phone}.`,
    'Need help? Reach us on WhatsApp or email — see the contact block in the app footer.',
  ],
} as const

/** Russia → Zambia — Sberbank transfer details */
export const KRYPTERA_PAY_BANK_RU = {
  phone: '+7 999 071-50-94',
  accountName: 'Каванда Ч',
  bankName: 'Сбербанк',
  instructions: [
    'Send only the amount shown for this transfer. Use the phone, recipient name, and bank exactly as listed.',
    'After paying, upload proof of payment on the next step before the timer ends.',
  ],
} as const

export const KRYPTERA_PAY_USDT = {
  /** Placeholder — replace with live treasury address when operations are ready */
  address: 'TXYZkrp7PLACEHOLDER9n3Q8Z7aB2cD4eF6gH',
  network: 'TRC20 (Tron)',
  instructions: [
    'Send only USDT on the network below. Wrong token or network can result in permanent loss.',
    'Double-check the address character by character before confirming in your wallet.',
  ],
} as const

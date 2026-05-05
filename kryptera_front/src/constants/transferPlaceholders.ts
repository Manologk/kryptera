import { CONTACT_INFO } from '@/constants';

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
];

export const PAYMENT_OPTIONS = [
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
];

/** Instructions shown after choosing sender payment method */
export const KRYPTERA_PAY_MOBILE_MONEY = {
  number: CONTACT_INFO.phone,
  displayNumber: CONTACT_INFO.phone,
  instructions: [
    'Open your mobile money app and send only the amount shown on the next screen (when available).',
    `Use this number as the recipient: ${CONTACT_INFO.phone}.`,
    'Need help? Reach us on WhatsApp or email — see the contact block in the app footer.',
  ],
} as const;

export const KRYPTERA_PAY_USDT = {
  /** Placeholder — replace with live treasury address when operations are ready */
  address: 'TXYZkrp7PLACEHOLDER9n3Q8Z7aB2cD4eF6gH',
  network: 'TRC20 (Tron)',
  instructions: [
    'Send only USDT on the network below. Wrong token or network can result in permanent loss.',
    'Double-check the address character by character before confirming in your wallet.',
  ],
} as const;

export type DeliveryOptionId = (typeof DELIVERY_OPTIONS)[number]['id'];
export type PaymentOptionId = (typeof PAYMENT_OPTIONS)[number]['id'];

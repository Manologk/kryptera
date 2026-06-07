import type { ConversionMode } from '@/types';
import type { PaymentReceivingConfig, PaymentReceivingDetails } from '@/services/api';
import {
  KRYPTERA_PAY_BANK_RU,
  KRYPTERA_PAY_MOBILE_MONEY,
  KRYPTERA_PAY_USDT,
  type PaymentOptionId,
} from '@/constants/transferPlaceholders';

const FALLBACK_MODES: Record<string, Record<PaymentOptionId, 'whatsapp' | 'inline'>> = {
  'russia-zambia': {
    pay_bank_ru: 'whatsapp',
    pay_crypto_usdt: 'whatsapp',
    pay_mobile_money: 'whatsapp',
  },
  'zambia-russia': {
    pay_mobile_money: 'inline',
    pay_crypto_usdt: 'inline',
    pay_bank_ru: 'inline',
  },
};

function fallbackDetails(paymentMethod: PaymentOptionId): PaymentReceivingDetails {
  if (paymentMethod === 'pay_bank_ru') {
    return {
      phone: KRYPTERA_PAY_BANK_RU.phone,
      account_name: KRYPTERA_PAY_BANK_RU.accountName,
      bank_name: KRYPTERA_PAY_BANK_RU.bankName,
      instructions: [...KRYPTERA_PAY_BANK_RU.instructions],
    };
  }
  if (paymentMethod === 'pay_crypto_usdt') {
    return {
      address: KRYPTERA_PAY_USDT.address,
      network: KRYPTERA_PAY_USDT.network,
      instructions: [...KRYPTERA_PAY_USDT.instructions],
    };
  }
  return {
    display_number: KRYPTERA_PAY_MOBILE_MONEY.displayNumber,
    instructions: [...KRYPTERA_PAY_MOBILE_MONEY.instructions],
  };
}

export function fallbackPaymentReceivingConfig(
  corridor: ConversionMode,
  paymentMethod: PaymentOptionId,
): PaymentReceivingConfig {
  const mode = FALLBACK_MODES[corridor]?.[paymentMethod] ?? 'whatsapp';
  return {
    id: 0,
    corridor,
    paymentMethod,
    displayMode: mode,
    details: fallbackDetails(paymentMethod),
    updatedAt: '',
  };
}

export function resolvePaymentReceivingConfig(
  configs: PaymentReceivingConfig[] | undefined,
  corridor: ConversionMode,
  paymentMethod: PaymentOptionId,
): PaymentReceivingConfig {
  const match = configs?.find(c => c.corridor === corridor && c.paymentMethod === paymentMethod);
  return match ?? fallbackPaymentReceivingConfig(corridor, paymentMethod);
}

export function whatsappMethodLabel(paymentMethod: string): string {
  if (paymentMethod === 'pay_bank_ru') return 'Bank transfer';
  if (paymentMethod === 'pay_crypto_usdt') return 'Crypto (USDT)';
  if (paymentMethod === 'pay_mobile_money') return 'Mobile money';
  return 'payment';
}

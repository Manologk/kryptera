import { CURRENCIES } from '@/constants';
import { roundMoney } from '@/lib/money';
import type { Currency } from '@/types';

/** Formatted amount for display (mono-friendly string). */
export function formatMoneyAmount(n: number, currency: Currency): string {
  const { symbol } = CURRENCIES[currency];
  const formatted = roundMoney(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === 'ZMW' ? `ZMW ${formatted}` : `${symbol}${formatted}`;
}

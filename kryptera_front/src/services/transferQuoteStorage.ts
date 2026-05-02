import type { ConversionMode } from '@/types';

const KEY = 'Kryptera_transfer_quote_v1';

export interface PersistedTransferQuote {
  mode: ConversionMode;
  inputAmount: number;
  commissionOnTop: boolean;
}

function isFinitePositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

export function saveTransferQuote(quote: PersistedTransferQuote): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(quote));
  } catch {
    /* quota / private mode */
  }
}

export function readTransferQuote(): PersistedTransferQuote | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<PersistedTransferQuote>;
    const mode = p.mode === 'zambia-russia' ? 'zambia-russia' : 'russia-zambia';
    const inputAmount = typeof p.inputAmount === 'number' ? p.inputAmount : Number(p.inputAmount);
    const commissionOnTop = Boolean(p.commissionOnTop);
    if (!isFinitePositive(inputAmount)) return null;
    return { mode, inputAmount, commissionOnTop };
  } catch {
    return null;
  }
}

export function clearTransferQuote(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

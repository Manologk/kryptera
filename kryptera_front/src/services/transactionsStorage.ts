/**
 * MVP: transfer quotes persisted on this browser only (no login).
 * Replaced later by Django + JWT; keep call sites on append/get helpers.
 */
import { TRANSACTIONS_STORAGE_KEY } from '@/constants';
import type { Currency, Transaction, TransactionStatus } from '@/types';

export type NewLocalTransactionInput = Pick<
  Transaction,
  'mode' | 'inputAmount' | 'inputCurrency' | 'resultAmount' | 'resultCurrency' | 'purpose'
>;

function nowIso(): string {
  return new Date().toISOString();
}

function isTransactionRow(o: unknown): o is Transaction {
  if (!o || typeof o !== 'object') return false;
  const r = o as Record<string, unknown>;
  const modeOk = r.mode === 'russia-zambia' || r.mode === 'zambia-russia';
  const ccy = (x: unknown): x is Currency => x === 'RUB' || x === 'ZMW' || x === 'USD';
  const statusOk = (x: unknown): x is TransactionStatus =>
    x === 'pop_not_uploaded' ||
    x === 'pending_verification' ||
    x === 'completed' ||
    x === 'rejected';
  return (
    typeof r.id === 'string' &&
    modeOk &&
    typeof r.inputAmount === 'number' &&
    typeof r.resultAmount === 'number' &&
    ccy(r.inputCurrency) &&
    ccy(r.resultCurrency) &&
    statusOk(r.status) &&
    typeof r.createdAt === 'string' &&
    typeof r.updatedAt === 'string'
  );
}

export function getLocalTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTransactionRow);
  } catch {
    return [];
  }
}

export function appendLocalTransaction(
  input: NewLocalTransactionInput,
): { ok: true; transaction: Transaction } | { ok: false; error: string } {
  const purpose = input.purpose?.trim() || undefined;
  const transaction: Transaction = {
    id: crypto.randomUUID(),
    mode: input.mode,
    inputAmount: input.inputAmount,
    inputCurrency: input.inputCurrency,
    resultAmount: input.resultAmount,
    resultCurrency: input.resultCurrency,
    purpose,
    status: 'pop_not_uploaded',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  try {
    const list = getLocalTransactions();
    list.unshift(transaction);
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(list));
    return { ok: true, transaction };
  } catch {
    return { ok: false, error: 'Could not save on this device.' };
  }
}

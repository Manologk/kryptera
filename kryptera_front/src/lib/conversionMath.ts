import type { ConversionBreakdown, ConversionMode, ExchangeRates } from '@/types'
import { roundMoney } from '@/lib/money'

export function commissionFraction(rates: ExchangeRates): number {
  const c = rates.commissionRate
  if (c != null && Number.isFinite(c) && c > 0 && c < 1) return c
  return 0.045
}

function roundedBreakdown(b: ConversionBreakdown): ConversionBreakdown {
  return {
    ...b,
    input: roundMoney(b.input),
    commission: roundMoney(b.commission),
    afterCommission: roundMoney(b.afterCommission),
    usd: roundMoney(b.usd),
    final: roundMoney(b.final),
    totalDebited: roundMoney(b.totalDebited),
  }
}

export function calcRussiaToZambia(
  principal: number,
  rates: ExchangeRates,
  commissionOnTop: boolean,
  cr: number,
): ConversionBreakdown {
  const p = roundMoney(principal)
  const commission = p * cr
  const afterCommission = commissionOnTop ? p : p * (1 - cr)
  const usd = afterCommission / rates.rubleToUsdBuying
  const final = usd * rates.usdToKwachaSelling
  const totalDebited = commissionOnTop ? p + commission : p
  return roundedBreakdown({
    input: p,
    inputCurrency: 'RUB',
    commission,
    afterCommission,
    usd,
    final,
    outputCurrency: 'ZMW',
    commissionOnTop,
    totalDebited,
    commissionRate: cr,
  })
}

export function calcZambiaToRussia(
  principal: number,
  rates: ExchangeRates,
  commissionOnTop: boolean,
  cr: number,
): ConversionBreakdown {
  const p = roundMoney(principal)
  const commission = p * cr
  const afterCommission = commissionOnTop ? p : p * (1 - cr)
  const usd = afterCommission / rates.kwachaToUsdBuying
  const final = usd * rates.usdToRubleSelling
  const totalDebited = commissionOnTop ? p + commission : p
  return roundedBreakdown({
    input: p,
    inputCurrency: 'ZMW',
    commission,
    afterCommission,
    usd,
    final,
    outputCurrency: 'RUB',
    commissionOnTop,
    totalDebited,
    commissionRate: cr,
  })
}

/** Undo FX + commission to get booking principal from desired output amount. */
export function principalFromFinal(
  mode: ConversionMode,
  finalAmount: number,
  rates: ExchangeRates,
  commissionOnTop: boolean,
  cr: number,
): number {
  const target = roundMoney(finalAmount)
  if (mode === 'russia-zambia') {
    const usd = target / rates.usdToKwachaSelling
    const afterCommission = usd * rates.rubleToUsdBuying
    const raw = commissionOnTop ? afterCommission : afterCommission / (1 - cr)
    return roundMoney(raw)
  }
  const usd = target / rates.usdToRubleSelling
  const afterCommission = usd * rates.kwachaToUsdBuying
  const raw = commissionOnTop ? afterCommission : afterCommission / (1 - cr)
  return roundMoney(raw)
}

/**
 * Principal booked from the "You send" field.
 * Within: gross sent (commission deducted from this). On top: full amount that converts.
 */
export function principalFromSendAmount(sendAmount: number): number {
  return roundMoney(sendAmount)
}

/** Value shown in "You send" after solving from a target receive amount. */
export function sendAmountFromBreakdown(breakdown: ConversionBreakdown): number {
  return breakdown.input
}

export function formatConverterAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return ''
  return String(roundMoney(value))
}

export function breakdownForMode(
  mode: ConversionMode,
  principal: number,
  rates: ExchangeRates,
  commissionOnTop: boolean,
  cr: number,
): ConversionBreakdown {
  return mode === 'russia-zambia'
    ? calcRussiaToZambia(principal, rates, commissionOnTop, cr)
    : calcZambiaToRussia(principal, rates, commissionOnTop, cr)
}
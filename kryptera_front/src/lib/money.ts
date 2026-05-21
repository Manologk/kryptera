export const MONEY_DECIMAL_PLACES = 2

/** Round to 2 decimal places for fiat amounts (avoids float noise in API payloads). */
export function roundMoney(value: number, decimals: number = MONEY_DECIMAL_PLACES): number {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/** String for Django DecimalField — always ≤ 2 decimal places. */
export function formatMoneyForApi(value: number): string {
  return roundMoney(value).toFixed(MONEY_DECIMAL_PLACES)
}

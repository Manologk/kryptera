/** Display labels for corridor slugs (synthetic From → To for admin table). */
export const RATE_SLUG_LABELS: Record<string, { from: string; to: string }> = {
  rub_usd_buy: { from: 'RUB', to: 'USD (buy)' },
  usd_zmw_sell: { from: 'USD', to: 'ZMW (sell)' },
  zmw_usd_buy: { from: 'ZMW', to: 'USD (buy)' },
  usd_rub_sell: { from: 'USD', to: 'RUB (sell)' },
};

export function rateSlugDisplay(slug: string): { from: string; to: string } {
  return RATE_SLUG_LABELS[slug] ?? { from: '—', to: slug };
}

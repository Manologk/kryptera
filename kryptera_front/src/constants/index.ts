import type { CurrencyMeta, ExchangeRates } from '@/types';

export { ROUTES, type RoutePath } from './routes';

export const STORAGE_KEY = 'Kryptera_rates';

/** Anonymous device ledger until backend auth exists */
export const TRANSACTIONS_STORAGE_KEY = 'Kryptera_transactions';

/** Persisted JWT session (access + refresh + user snapshot) */
export const AUTH_STORAGE_KEY = 'Kryptera_auth';

export const CURRENCIES: Record<'RUB' | 'ZMW' | 'USD', CurrencyMeta> = {
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', flag: '🇷🇺' },
  ZMW: { code: 'ZMW', symbol: 'ZMW', name: 'Zambian Kwacha', flag: '🇿🇲' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
};

/** Placeholder before GET /rates/ — no sample numbers; UI stays in loading or empty state. */
export const DEFAULT_RATES: ExchangeRates = {
  rubleToUsdBuying: 0,
  usdToKwachaSelling: 0,
  kwachaToUsdBuying: 0,
  usdToRubleSelling: 0,
};

export const CONTACT_INFO = {
  email: 'support@kryptera.cc',
  phone: '+260771330585',
  whatsapp: '260771330585',
  telegram: '@Kryptera',
};

// Future: Django API base URL (proxied via Vite in dev)
export const API_BASE = '/api/v1';

/** Default page size for most admin list endpoints (Django REST global PAGE_SIZE). */
export const ADMIN_PAGE_SIZE = 20;

/** Transaction tables (activity + admin tx list); admin API uses min 10 per page. */
export const TRANSACTION_TABLE_PAGE_SIZE = 10;

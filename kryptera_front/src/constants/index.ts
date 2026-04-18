import type { CurrencyMeta, ExchangeRates } from '@/types';

export { ROUTES, type RoutePath } from './routes';

export const COMMISSION_RATE = 0.045; // 4.5%

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

export const DEFAULT_RATES: ExchangeRates = {
  rubleToUsdBuying: 95.5,
  usdToKwachaSelling: 27.5,
  kwachaToUsdBuying: 28.0,
  usdToRubleSelling: 96.0,
};

export const CONTACT_INFO = {
  email: 'support@Kryptera.com',
  phone: '+1 (234) 567-890',
  whatsapp: '+1234567890',
  telegram: '@Kryptera',
};

// Future: Django API base URL (proxied via Vite in dev)
export const API_BASE = '/api/v1';

/** Matches Django REST `PAGE_SIZE` for admin list endpoints */
export const ADMIN_PAGE_SIZE = 20;

/** URL paths — single source for `<Routes>`, `<Navigate>`, and nav links */
export const ROUTES = {
  home: '/',
  activity: '/activity',
  recipients: '/recipients',
  admin: '/admin',
  adminDashboard: '/admin/dashboard',
  /** @deprecated use adminDashboard */
  adminOverview: '/admin/dashboard',
  adminRates: '/admin/rates',
  adminCurrencies: '/admin/currencies',
  adminUsers: '/admin/users',
  adminTransactions: '/admin/transactions',
  login: '/login',
  register: '/register',
} as const;

export function activityTransaction(id: string): string {
  return `/activity/${encodeURIComponent(id)}`;
}

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

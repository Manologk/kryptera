/** URL paths — single source for `<Routes>`, `<Navigate>`, and nav links */
export const ROUTES = {
  home: '/',
  transfer: '/transfer',
  activity: '/activity',
  recipients: '/recipients',
  admin: '/admin',
  adminDashboard: '/admin/dashboard',
  /** @deprecated use adminDashboard */
  adminOverview: '/admin/dashboard',
  adminRates: '/admin/rates',
  adminPaymentDetails: '/admin/payment-details',
  adminCurrencies: '/admin/currencies',
  adminUsers: '/admin/users',
  adminTransactions: '/admin/transactions',
  adminPending: '/admin/pending',
  login: '/login',
  register: '/register',
  kyc: '/kyc',
} as const;

export function activityTransaction(id: string): string {
  return `/activity/${encodeURIComponent(id)}`;
}

/** Confirmation / POP upload after completing the transfer wizard */
export function transferConfirmation(id: string): string {
  return `/transfer/${encodeURIComponent(id)}/confirmation`;
}

/** Admin pending-verification detail page */
export function adminPendingDetail(id: string): string {
  return `/admin/pending/${encodeURIComponent(id)}`;
}

/** Admin transaction detail (full lifecycle) */
export function adminTransactionDetail(id: string): string {
  return `/admin/transactions/${encodeURIComponent(id)}`;
}

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

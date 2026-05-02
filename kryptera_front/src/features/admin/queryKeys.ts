export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  timeseries: (days: number) => ['admin', 'timeseries', days] as const,
  users: (page: number, search: string) => ['admin', 'users', page, search] as const,
  user: (id: number) => ['admin', 'user', id] as const,
  transactions: (page: number, filters: Record<string, string>) => ['admin', 'tx', page, filters] as const,
  transaction: (id: string) => ['admin', 'tx', id] as const,
  pendingTransactions: (page: number) => ['admin', 'pendingTx', page] as const,
  pendingTransaction: (id: string) => ['admin', 'pendingTx', id] as const,
  currencies: (page: number) => ['admin', 'currencies', page] as const,
  rateQuotes: (page: number) => ['admin', 'rateQuotes', page] as const,
};

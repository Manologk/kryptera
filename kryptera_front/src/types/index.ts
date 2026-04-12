// ── Exchange Rates ─────────────────────────────────────────────────────────
export interface ExchangeRates {
  rubleToUsdBuying: number; // How many ₽ = $1
  usdToKwachaSelling: number; // $1 = how many ZMW
  kwachaToUsdBuying: number; // How many ZMW = $1
  usdToRubleSelling: number; // $1 = how many ₽
  updatedAt?: string;
}

// ── Conversion ─────────────────────────────────────────────────────────────
export type ConversionMode = 'russia-zambia' | 'zambia-russia';

export interface ConversionBreakdown {
  /** Amount entered (inclusive: gross sent; on-top: principal that converts). */
  input: number;
  inputCurrency: Currency;
  commission: number;
  afterCommission: number;
  usd: number;
  final: number;
  outputCurrency: Currency;
  /** If true, commission is charged on top of `input`; full `input` converts. */
  commissionOnTop: boolean;
  /** Total debited from user (inclusive: equals `input`; on-top: `input` + commission). */
  totalDebited: number;
}

export type Currency = 'RUB' | 'ZMW' | 'USD';

export interface CurrencyMeta {
  code: Currency;
  symbol: string;
  name: string;
  flag: string;
}

/** Enabled currency row from GET /currencies/ */
export interface ApiCurrency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  flagEmoji: string;
  sortOrder: number;
  isEnabled: boolean;
}

// ── Recipients ───────────────────────────────────────────────────────────────
export interface Recipient {
  id: number;
  label: string;
  fullName: string;
  email?: string;
  phone?: string;
  payoutDetails: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecipientThin {
  id: number;
  label: string;
  fullName: string;
  email?: string;
  phone?: string;
}

// ── Transaction ─────────────────────────────────────────────────────────────
export type TransactionStatus =
  | 'pop_not_uploaded'
  | 'pending_verification'
  | 'completed'
  | 'rejected';

export interface RateSnapshot {
  rubleToUsdBuying: string;
  usdToKwachaSelling: string;
  kwachaToUsdBuying: string;
  usdToRubleSelling: string;
  commissionRate?: string;
}

export interface ConversionBreakdownView {
  input: string;
  inputCurrency: string;
  commissionRate: string;
  commissionAmount: string;
  afterCommission: string;
  usd: string;
  final: string;
  outputCurrency: string;
}

export interface Transaction {
  id: string;
  mode: ConversionMode;
  inputAmount: number;
  inputCurrency: Currency;
  resultAmount: number;
  resultCurrency: Currency;
  purpose?: string;
  status: TransactionStatus;
  popPath?: string;
  receiptPath?: string;
  /** Present on admin API responses */
  userEmail?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  recipient?: RecipientThin;
  recipientSnapshot?: Record<string, string>;
  rateSnapshot?: RateSnapshot;
  conversionBreakdown?: ConversionBreakdownView;
}

// ── User / Auth ─────────────────────────────────────────────────────────────
export type KycStatus = 'not_submitted' | 'pending' | 'verified' | 'rejected';

export interface User {
  id: number;
  email: string;
  fullName?: string;
  phone?: string;
  isAdmin: boolean;
  kycStatus: KycStatus;
  createdAt: string;
  suspendedUntil?: string;
  suspensionReason?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

/** Login / register response from the API */
export interface AuthSession extends AuthTokens {
  user: User;
}

// ── Admin dashboard ─────────────────────────────────────────────────────────
export interface AdminDashboardStats {
  userCount: number;
  adminCount: number;
  transactionTotal: number;
  transactionsByStatus: Record<string, number>;
  totalInputAmountSum: string;
  pendingVerificationCount: number;
  enabledCurrencyCount: number;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AdminTransactionsByDayPoint {
  date: string | null;
  count: number;
}

export interface AdminTransactionsByDayResponse {
  days: number;
  series: AdminTransactionsByDayPoint[];
}

// ── API ────────────────────────────────────────────────────────────────────
export interface ApiError {
  message: string;
  code?: string;
  field?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// ── UI ─────────────────────────────────────────────────────────────────────
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// ── Exchange Rates ─────────────────────────────────────────────────────────
export interface ExchangeRates {
  rubleToUsdBuying: number; // How many ₽ = $1
  usdToKwachaSelling: number; // $1 = how many ZMW
  kwachaToUsdBuying: number; // How many ZMW = $1
  usdToRubleSelling: number; // $1 = how many ₽
  updatedAt?: string;
  /** Platform commission as a fraction (e.g. 0.045 = 4.5%). From GET /rates/. */
  commissionRate?: number;
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
  /** Fraction used for this breakdown (matches platform settings at calculate time). */
  commissionRate: number;
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
/** Saved payout contact — belongs to the sender only; not a login account. */
export interface Recipient {
  id: number;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  deliveryMethod?: string;
  deliveryDetails: Record<string, unknown>;
  createdAt: string;
}

export interface RecipientThin {
  id: number;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  deliveryMethod?: string;
  deliveryDetails?: Record<string, unknown>;
}

// ── Transaction ─────────────────────────────────────────────────────────────
export type TransactionStatus =
  | 'pending'
  | 'awaiting_confirmation'
  | 'pop_not_uploaded'
  | 'pending_verification'
  | 'completed'
  | 'rejected'
  | 'canceled';

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
  deliveryMethod?: string;
  paymentMethod?: string;
  status: TransactionStatus;
  /** ISO — legacy short POP window when set. */
  proofDeadlineAt?: string;
  /** ISO — finish-later payment window from the server. */
  paymentDeadlineAt?: string;
  finishLater?: boolean;
  /** Seconds left until payment_deadline (or legacy proof_deadline); from GET transaction. */
  secondsRemaining?: number;
  popPath?: string;
  /** Delivery proof file path from API (legacy receipts may only populate receiptPath). */
  deliveryProofPath?: string;
  /** Public notes from admin shown with delivery proof when completed */
  deliveryNotes?: string | null;
  completedAt?: string;
  /** Legacy admin-upload path before delivery_proof field */
  receiptPath?: string;
  /** Present on admin API responses */
  userEmail?: string;
  userFullName?: string;
  userPhone?: string;
  referenceCode?: string;
  receiptConfirmed?: boolean;
  receiptConfirmedAt?: string;
  adminNote?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  recipient?: RecipientThin;
  recipientSnapshot?: Record<string, string>;
  rateSnapshot?: RateSnapshot;
  conversionBreakdown?: ConversionBreakdownView;
  /** Admin list/detail: commission fee in ZMW (booking-time FX). */
  commissionAmountZmw?: number;
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
  kycLegalName?: string;
  kycIdNumber?: string;
  kycCountry?: string;
  kycSubmittedAt?: string;
  kycRejectionReason?: string;
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
  totalCommissionZmw: number;
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
  /** Sum of input_amount for rows with input currency ZMW that day */
  volumeZmw: number;
  /** Sum of input_amount for rows with input currency RUB that day */
  volumeRub: number;
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

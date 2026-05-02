/**
 * api.ts — Django REST API client (/api/v1 via Vite proxy → backend)
 */

import { API_BASE } from '@/constants';
import { getAuthBridge } from '@/services/authBridge';
import type {
  AdminDashboardStats,
  AdminTransactionsByDayResponse,
  ApiCurrency,
  ApiError,
  ApiResponse,
  AuthSession,
  ConversionBreakdownView,
  Currency,
  ExchangeRates,
  Paginated,
  RateSnapshot,
  Recipient,
  Transaction,
  TransactionStatus,
  User,
} from '@/types';

// ── Snake_case ↔ app types ─────────────────────────────────────────────────

function ratesFromApi(row: Record<string, unknown>): ExchangeRates {
  const cr = row.commission_rate;
  const commissionRate =
    cr != null && cr !== '' && Number.isFinite(Number(cr)) ? Number(cr) : undefined;
  return {
    rubleToUsdBuying: Number(row.ruble_to_usd_buying),
    usdToKwachaSelling: Number(row.usd_to_kwacha_selling),
    kwachaToUsdBuying: Number(row.kwacha_to_usd_buying),
    usdToRubleSelling: Number(row.usd_to_ruble_selling),
    updatedAt: row.updated_at != null ? String(row.updated_at) : undefined,
    commissionRate,
  };
}

function ratesToApi(r: ExchangeRates): Record<string, number> {
  return {
    ruble_to_usd_buying: r.rubleToUsdBuying,
    usd_to_kwacha_selling: r.usdToKwachaSelling,
    kwacha_to_usd_buying: r.kwachaToUsdBuying,
    usd_to_ruble_selling: r.usdToRubleSelling,
  };
}

function userFromApi(row: Record<string, unknown>): User {
  const kyc = row.kyc_status;
  const kycOk =
    kyc === 'not_submitted' ||
    kyc === 'pending' ||
    kyc === 'verified' ||
    kyc === 'rejected'
      ? kyc
      : 'not_submitted';

  return {
    id: Number(row.id),
    email: String(row.email),
    fullName: row.full_name != null && row.full_name !== '' ? String(row.full_name) : undefined,
    phone: row.phone != null && row.phone !== '' ? String(row.phone) : undefined,
    isAdmin: Boolean(row.is_admin),
    kycStatus: kycOk,
    createdAt: String(row.created_at),
    suspendedUntil:
      row.suspended_until != null && String(row.suspended_until) !== ''
        ? String(row.suspended_until)
        : undefined,
    suspensionReason:
      row.suspension_reason != null && String(row.suspension_reason) !== ''
        ? String(row.suspension_reason)
        : undefined,
  };
}

function breakdownFromApi(b: Record<string, unknown> | undefined): ConversionBreakdownView | undefined {
  if (!b || typeof b !== 'object') return undefined;
  return {
    input: String(b.input ?? ''),
    inputCurrency: String(b.input_currency ?? ''),
    commissionRate: String(b.commission_rate ?? ''),
    commissionAmount: String(b.commission_amount ?? ''),
    afterCommission: String(b.after_commission ?? ''),
    usd: String(b.usd ?? ''),
    final: String(b.final ?? ''),
    outputCurrency: String(b.output_currency ?? ''),
  };
}

function rateSnapshotFromApi(s: unknown): RateSnapshot | undefined {
  if (!s || typeof s !== 'object') return undefined;
  const o = s as Record<string, unknown>;
  return {
    rubleToUsdBuying: String(o.ruble_to_usd_buying ?? ''),
    usdToKwachaSelling: String(o.usd_to_kwacha_selling ?? ''),
    kwachaToUsdBuying: String(o.kwacha_to_usd_buying ?? ''),
    usdToRubleSelling: String(o.usd_to_ruble_selling ?? ''),
    commissionRate: o.commission_rate != null ? String(o.commission_rate) : undefined,
  };
}

function recipientSnapshotFromApi(s: unknown): Record<string, string> | undefined {
  if (!s || typeof s !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(s as Record<string, unknown>)) {
    if (v == null) continue;
    if (typeof v === 'object' && !Array.isArray(v)) {
      out[k] = JSON.stringify(v);
    } else {
      out[k] = String(v);
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function recipientThinFromApi(row: Record<string, unknown> | undefined) {
  if (!row || typeof row !== 'object') return undefined;
  const det = row.delivery_details;
  return {
    id: Number(row.id),
    fullName: String(row.full_name ?? ''),
    email: row.email != null && String(row.email) !== '' ? String(row.email) : undefined,
    phoneNumber:
      row.phone_number != null && String(row.phone_number) !== '' ? String(row.phone_number) : undefined,
    deliveryMethod:
      row.delivery_method != null && String(row.delivery_method) !== ''
        ? String(row.delivery_method)
        : undefined,
    deliveryDetails:
      det != null && typeof det === 'object' ? (det as Record<string, unknown>) : undefined,
  };
}

function transactionFromApi(row: Record<string, unknown>): Transaction {
  const status = row.status;
  const statusOk: TransactionStatus =
    status === 'pending' ||
    status === 'awaiting_confirmation' ||
    status === 'pop_not_uploaded' ||
    status === 'pending_verification' ||
    status === 'completed' ||
    status === 'rejected'
      ? status
      : 'pending';

  return {
    id: String(row.id),
    mode: row.mode === 'zambia-russia' ? 'zambia-russia' : 'russia-zambia',
    inputAmount: Number(row.input_amount),
    inputCurrency: row.input_currency as Currency,
    resultAmount: Number(row.result_amount),
    resultCurrency: row.result_currency as Currency,
    purpose: row.purpose != null && String(row.purpose) !== '' ? String(row.purpose) : undefined,
    deliveryMethod:
      row.delivery_method != null && String(row.delivery_method) !== ''
        ? String(row.delivery_method)
        : undefined,
    paymentMethod:
      row.payment_method != null && String(row.payment_method) !== ''
        ? String(row.payment_method)
        : undefined,
    status: statusOk,
    userEmail: row.user_email != null && String(row.user_email) !== '' ? String(row.user_email) : undefined,
    userFullName:
      row.user_full_name != null && String(row.user_full_name) !== ''
        ? String(row.user_full_name)
        : undefined,
    userPhone:
      row.user_phone != null && String(row.user_phone) !== '' ? String(row.user_phone) : undefined,
    referenceCode:
      row.reference_code != null && String(row.reference_code) !== ''
        ? String(row.reference_code)
        : undefined,
    receiptConfirmed:
      row.receipt_confirmed != null ? Boolean(row.receipt_confirmed) : undefined,
    receiptConfirmedAt:
      row.receipt_confirmed_at != null && String(row.receipt_confirmed_at) !== ''
        ? String(row.receipt_confirmed_at)
        : undefined,
    adminNote: row.admin_note != null && String(row.admin_note) !== '' ? String(row.admin_note) : undefined,
    adminNotes: row.admin_notes != null && String(row.admin_notes) !== '' ? String(row.admin_notes) : undefined,
    popPath: row.pop_file != null && String(row.pop_file) !== '' ? String(row.pop_file) : undefined,
    deliveryProofPath:
      row.delivery_proof != null && String(row.delivery_proof) !== ''
        ? String(row.delivery_proof)
        : undefined,
    receiptPath:
      row.receipt_file != null && String(row.receipt_file) !== ''
        ? String(row.receipt_file)
        : undefined,
    deliveryNotes:
      row.delivery_notes != null && String(row.delivery_notes) !== ''
        ? String(row.delivery_notes)
        : row.delivery_notes === null || row.delivery_notes === ''
          ? null
          : undefined,
    completedAt:
      row.completed_at != null && String(row.completed_at) !== ''
        ? String(row.completed_at)
        : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    recipient: recipientThinFromApi(row.recipient as Record<string, unknown> | undefined),
    recipientSnapshot: recipientSnapshotFromApi(row.recipient_snapshot),
    rateSnapshot: rateSnapshotFromApi(row.rate_snapshot),
    conversionBreakdown: breakdownFromApi(row.conversion_breakdown as Record<string, unknown> | undefined),
    commissionAmountZmw:
      row.commission_amount_zmw != null && row.commission_amount_zmw !== ''
        ? Number(row.commission_amount_zmw)
        : undefined,
  };
}

function recipientFromApi(row: Record<string, unknown>): Recipient {
  const det = row.delivery_details;
  return {
    id: Number(row.id),
    fullName: String(row.full_name ?? ''),
    email: row.email != null && String(row.email) !== '' ? String(row.email) : undefined,
    phoneNumber:
      row.phone_number != null && String(row.phone_number) !== '' ? String(row.phone_number) : undefined,
    deliveryMethod:
      row.delivery_method != null && String(row.delivery_method) !== ''
        ? String(row.delivery_method)
        : undefined,
    deliveryDetails:
      det != null && typeof det === 'object' ? (det as Record<string, unknown>) : {},
    createdAt: String(row.created_at),
  };
}

function currencyFromApi(row: Record<string, unknown>): ApiCurrency {
  return {
    id: Number(row.id),
    code: String(row.code),
    name: String(row.name),
    symbol: String(row.symbol ?? ''),
    flagEmoji: String(row.flag_emoji ?? ''),
    sortOrder: Number(row.sort_order ?? 0),
    isEnabled: row.is_enabled == null ? true : Boolean(row.is_enabled),
  };
}

function formatApiError(json: unknown, status: number): ApiError {
  if (!json || typeof json !== 'object') {
    return { message: status === 0 ? 'Network error' : 'Request failed', code: String(status) };
  }
  const j = json as Record<string, unknown>;

  if (typeof j.detail === 'string') {
    return { message: j.detail, code: String(status) };
  }
  if (Array.isArray(j.detail) && j.detail.length > 0) {
    const first = j.detail[0];
    if (typeof first === 'string') return { message: first, code: String(status) };
  }
  if (Array.isArray(j.non_field_errors) && j.non_field_errors.length > 0) {
    return { message: String(j.non_field_errors[0]), code: String(status) };
  }
  for (const [key, val] of Object.entries(j)) {
    if (Array.isArray(val) && val.length > 0) {
      return { message: `${key}: ${val[0]}`, code: String(status), field: key };
    }
    if (typeof val === 'string') {
      return { message: `${key}: ${val}`, code: String(status), field: key };
    }
  }
  return { message: 'Request failed', code: String(status) };
}

function parsePaginated<T>(
  raw: unknown,
  mapRow: (row: Record<string, unknown>) => T,
): Paginated<T> | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.results)) return null;
  return {
    count: Number(o.count ?? o.results.length),
    next: o.next != null && String(o.next) !== '' ? String(o.next) : null,
    previous: o.previous != null && String(o.previous) !== '' ? String(o.previous) : null,
    results: o.results.map(r => mapRow(r as Record<string, unknown>)),
  };
}

// ── HTTP ───────────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${path}`;
  const isForm = options?.body instanceof FormData;
  const baseHeaders: Record<string, string> = {};
  if (!isForm) baseHeaders['Content-Type'] = 'application/json';

  const mergedHeaders = {
    ...baseHeaders,
    ...(options?.headers as Record<string, string> | undefined),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers: mergedHeaders,
    });

    const text = await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        if (!res.ok) {
          return { error: { message: text.slice(0, 200) || 'Invalid response', code: String(res.status) } };
        }
      }
    }

    if (!res.ok) {
      return { error: formatApiError(json, res.status) };
    }

    return { data: json as T };
  } catch (err) {
    return {
      error: {
        message: err instanceof Error ? err.message : 'Network error',
        code: '0',
      },
    };
  }
}

async function withTokenRetry<T>(
  accessToken: string,
  fn: (t: string) => Promise<ApiResponse<T>>,
): Promise<ApiResponse<T>> {
  const r = await fn(accessToken);
  if (r.error?.code !== '401') return r;
  const b = getAuthBridge();
  const refTok = b?.getRefresh();
  if (!refTok) return r;
  const ref = await refreshToken(refTok);
  if (!ref.data?.access) return r;
  b.setAccess(ref.data.access);
  return fn(ref.data.access);
}

// ── Rates ──────────────────────────────────────────────────────────────────

export async function getRates(): Promise<ApiResponse<ExchangeRates>> {
  const res = await request<Record<string, unknown>>('/rates/');
  if (res.error) return { error: res.error };
  if (res.data == null) return { error: { message: 'Empty response' } };
  return { data: ratesFromApi(res.data) };
}

export async function getCurrencies(): Promise<ApiResponse<ApiCurrency[]>> {
  const res = await request<Record<string, unknown> | unknown[]>('/currencies/');
  if (res.error) return { error: res.error };
  if (res.data == null) return { error: { message: 'Empty response' } };
  const raw = res.data;
  const rows: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { results?: unknown[] }).results)
      ? (raw as { results: unknown[] }).results
      : [];
  return { data: rows.map(r => currencyFromApi(r as Record<string, unknown>)) };
}

export async function updateRates(
  rates: ExchangeRates,
  accessToken: string,
): Promise<ApiResponse<ExchangeRates>> {
  return withTokenRetry(accessToken, t =>
    request<Record<string, unknown>>('/rates/', {
      method: 'PUT',
      body: JSON.stringify(ratesToApi(rates)),
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      return { data: ratesFromApi(res.data) };
    }),
  );
}

/** Admin: update platform commission fraction (e.g. 0.045 for 4.5%). */
export async function patchPlatformCommission(
  commissionRate: number,
  accessToken: string,
): Promise<ApiResponse<{ commissionRate: number; updatedAt: string }>> {
  return withTokenRetry(accessToken, t =>
    request<Record<string, unknown>>('/rates/commission/', {
      method: 'PATCH',
      body: JSON.stringify({ commission_rate: commissionRate }),
      headers: {
        Authorization: `Bearer ${t}`,
        'Content-Type': 'application/json',
      },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      const d = res.data;
      return {
        data: {
          commissionRate: Number(d.commission_rate),
          updatedAt: String(d.updated_at ?? ''),
        },
      };
    }),
  );
}

// ── Auth ───────────────────────────────────────────────────────────────────

function sessionFromTokenPayload(data: {
  access: string;
  refresh: string;
  user: unknown;
}): AuthSession | null {
  if (!data.user || typeof data.user !== 'object') return null;
  return {
    access: data.access,
    refresh: data.refresh,
    user: userFromApi(data.user as Record<string, unknown>),
  };
}

export async function login(email: string, password: string): Promise<ApiResponse<AuthSession>> {
  const res = await request<{ access: string; refresh: string; user?: unknown }>('/auth/token/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.error) return { error: res.error };
  if (!res.data) return { error: { message: 'Empty response' } };
  const session = sessionFromTokenPayload({
    access: res.data.access,
    refresh: res.data.refresh,
    user: res.data.user,
  });
  if (!session) return { error: { message: 'Invalid login response' } };
  return { data: session };
}

export async function register(input: {
  email: string;
  password: string;
  password2: string;
  full_name?: string;
  phone?: string;
}): Promise<ApiResponse<AuthSession>> {
  const res = await request<{ access: string; refresh: string; user?: unknown }>('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (res.error) return { error: res.error };
  if (!res.data) return { error: { message: 'Empty response' } };
  const session = sessionFromTokenPayload({
    access: res.data.access,
    refresh: res.data.refresh,
    user: res.data.user,
  });
  if (!session) return { error: { message: 'Invalid register response' } };
  return { data: session };
}

export async function refreshToken(refresh: string): Promise<ApiResponse<{ access: string }>> {
  return request<{ access: string }>('/auth/token/refresh/', {
    method: 'POST',
    body: JSON.stringify({ refresh }),
  });
}

export async function getMe(token: string): Promise<ApiResponse<User>> {
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>('/auth/me/', {
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      return { data: userFromApi(res.data) };
    }),
  );
}

// ── Recipients ─────────────────────────────────────────────────────────────

export async function getRecipients(token: string): Promise<ApiResponse<Recipient[]>> {
  return withTokenRetry(token, t =>
    request<Record<string, unknown> | unknown[]>('/recipients/', {
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      const raw = res.data;
      const rows: unknown[] = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { results?: unknown[] }).results)
          ? (raw as { results: unknown[] }).results
          : [];
      return { data: rows.map(r => recipientFromApi(r as Record<string, unknown>)) };
    }),
  );
}

export async function createRecipient(
  token: string,
  body: {
    full_name: string;
    email?: string;
    phone_number?: string;
    delivery_method: string;
    delivery_details?: Record<string, unknown>;
  },
): Promise<ApiResponse<Recipient>> {
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>('/recipients/', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      return { data: recipientFromApi(res.data) };
    }),
  );
}

export async function updateRecipient(
  token: string,
  id: number,
  body: Partial<{
    full_name: string;
    email: string;
    phone_number: string;
    delivery_method: string;
    delivery_details: Record<string, unknown>;
  }>,
): Promise<ApiResponse<Recipient>> {
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>(`/recipients/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      return { data: recipientFromApi(res.data) };
    }),
  );
}

export async function deleteRecipient(token: string, id: number): Promise<ApiResponse<void>> {
  return withTokenRetry(token, t =>
    request<unknown>(`/recipients/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      return { data: undefined };
    }),
  );
}

// ── Transactions ───────────────────────────────────────────────────────────

export async function getTransactions(token: string): Promise<ApiResponse<Transaction[]>> {
  return withTokenRetry(token, t =>
    request<Record<string, unknown> | unknown[]>('/transactions/', {
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      const raw = res.data;
      const rows: unknown[] = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { results?: unknown[] }).results)
          ? (raw as { results: unknown[] }).results
          : [];
      return { data: rows.map(r => transactionFromApi(r as Record<string, unknown>)) };
    }),
  );
}

export async function getTransaction(token: string, id: string): Promise<ApiResponse<Transaction>> {
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>(`/transactions/${id}/`, {
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      return { data: transactionFromApi(res.data) };
    }),
  );
}

export async function createTransaction(
  payload: {
    mode: Transaction['mode'];
    inputAmount: number;
    purpose?: string;
    recipientId?: number | null;
    recipientFullName?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    recipientDeliveryMethod?: string;
    recipientDeliveryDetails?: Record<string, unknown>;
    commissionOnTop?: boolean;
    deliveryMethod?: string;
    paymentMethod?: string;
  },
  token: string,
): Promise<ApiResponse<Transaction>> {
  const body: Record<string, unknown> = {
    mode: payload.mode,
    input_amount: String(payload.inputAmount),
    purpose: payload.purpose?.trim() ?? '',
  };
  if (payload.commissionOnTop === true) {
    body.commission_on_top = true;
  }
  if (payload.recipientId != null) {
    body.recipient_id = payload.recipientId;
  }
  if (payload.recipientFullName != null && payload.recipientFullName.trim() !== '') {
    body.recipient_full_name = payload.recipientFullName.trim();
  }
  if (payload.recipientEmail != null && payload.recipientEmail.trim() !== '') {
    body.recipient_email = payload.recipientEmail.trim();
  }
  if (payload.recipientPhone != null && payload.recipientPhone.trim() !== '') {
    body.recipient_phone = payload.recipientPhone.trim();
  }
  if (payload.recipientDeliveryMethod != null && payload.recipientDeliveryMethod.trim() !== '') {
    body.recipient_delivery_method = payload.recipientDeliveryMethod.trim();
  }
  if (payload.recipientDeliveryDetails != null && Object.keys(payload.recipientDeliveryDetails).length > 0) {
    body.recipient_delivery_details = payload.recipientDeliveryDetails;
  }
  if (payload.deliveryMethod != null && payload.deliveryMethod !== '') {
    body.delivery_method = payload.deliveryMethod;
  }
  if (payload.paymentMethod != null && payload.paymentMethod !== '') {
    body.payment_method = payload.paymentMethod;
  }
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>('/transactions/', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      return { data: transactionFromApi(res.data) };
    }),
  );
}

export async function uploadPop(
  transactionId: string,
  file: File,
  token: string,
): Promise<ApiResponse<Transaction>> {
  return withTokenRetry(token, t => {
    const form = new FormData();
    form.append('pop_file', file);
    return request<Record<string, unknown>>(`/transactions/${transactionId}/pop/`, {
      method: 'POST',
      body: form,
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      return { data: transactionFromApi(res.data) };
    });
  });
}

// ── Admin API ──────────────────────────────────────────────────────────────

function adminStatsFromApi(row: Record<string, unknown>): AdminDashboardStats {
  const by = row.transactions_by_status;
  return {
    userCount: Number(row.user_count ?? 0),
    adminCount: Number(row.admin_count ?? 0),
    transactionTotal: Number(row.transaction_total ?? 0),
    transactionsByStatus:
      by != null && typeof by === 'object' ? (by as Record<string, number>) : {},
    totalCommissionZmw: String(row.total_commission_zmw ?? '0'),
    pendingVerificationCount: Number(row.pending_verification_count ?? 0),
    enabledCurrencyCount: Number(row.enabled_currency_count ?? 0),
  };
}

export async function getAdminDashboardStats(token: string): Promise<ApiResponse<AdminDashboardStats>> {
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>('/admin/dashboard/stats/', {
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      return { data: adminStatsFromApi(res.data) };
    }),
  );
}

export async function getAdminDashboardTimeseries(
  token: string,
  days?: number,
): Promise<ApiResponse<AdminTransactionsByDayResponse>> {
  const q = days != null ? `?days=${days}` : '';
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>(`/admin/dashboard/transactions-by-day${q}`, {
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      const d = res.data;
      const seriesRaw = d.series;
      const series: AdminTransactionsByDayResponse['series'] = Array.isArray(seriesRaw)
        ? (seriesRaw as Record<string, unknown>[]).map(s => ({
            date: s.date != null ? String(s.date) : null,
            volumeZmw: Number(s.volume_zmw ?? 0),
            volumeRub: Number(s.volume_rub ?? 0),
          }))
        : [];
      return {
        data: {
          days: Number(d.days ?? 30),
          series,
        },
      };
    }),
  );
}

export async function getAdminTransactions(
  token: string,
  query?: Record<string, string | number | undefined>,
): Promise<ApiResponse<Paginated<Transaction>>> {
  const q = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== '') q.set(k, String(v));
    }
  }
  const qs = q.toString();
  const path = qs ? `/transactions/admin/?${qs}` : '/transactions/admin/';
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>(path, {
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      const paged = parsePaginated(res.data, r => transactionFromApi(r));
      if (paged) return { data: paged };
      return { error: { message: 'Invalid paginated response' } };
    }),
  );
}

export async function getAdminTransaction(token: string, id: string): Promise<ApiResponse<Transaction>> {
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>(`/transactions/admin/${id}/`, {
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      return { data: transactionFromApi(res.data) };
    }),
  );
}

export async function patchAdminTransaction(
  token: string,
  id: string,
  body: {
    status?: TransactionStatus;
    admin_note?: string;
    admin_notes?: string;
    confirmReceipt?: boolean;
    delivery_proof?: File;
    receipt_file?: File;
  },
): Promise<ApiResponse<Transaction>> {
  const file = body.delivery_proof ?? body.receipt_file;
  const onlyConfirm =
    body.confirmReceipt === true &&
    body.status == null &&
    !(file instanceof File) &&
    body.admin_notes == null &&
    body.admin_note == null;

  const needsMultipart =
    file instanceof File ||
    body.admin_notes != null ||
    body.admin_note != null ||
    body.status != null ||
    body.confirmReceipt === true;

  return withTokenRetry(token, t => {
    const init: RequestInit = {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${t}` },
    };
    if (onlyConfirm) {
      init.body = JSON.stringify({ confirm_receipt: true });
    } else if (needsMultipart) {
      const form = new FormData();
      if (body.confirmReceipt === true) form.append('confirm_receipt', 'true');
      if (body.status != null) form.append('status', body.status);
      if (body.admin_note != null) form.append('admin_note', body.admin_note);
      if (body.admin_notes != null) form.append('admin_notes', body.admin_notes);
      if (file instanceof File) form.append('delivery_proof', file);
      init.body = form;
    } else {
      const json: Record<string, unknown> = {};
      if (body.status != null) json.status = body.status;
      if (body.admin_note != null) json.admin_note = body.admin_note;
      init.body = JSON.stringify(json);
    }
    return request<Record<string, unknown>>(`/transactions/admin/${id}/`, init).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      return { data: transactionFromApi(res.data) };
    });
  });
}

export type AdminUserRow = User & { isActive?: boolean; isStaff?: boolean; updatedAt?: string };

function adminUserFromApi(row: Record<string, unknown>): AdminUserRow {
  const base = userFromApi(row);
  return {
    ...base,
    isActive: row.is_active != null ? Boolean(row.is_active) : undefined,
    isStaff: row.is_staff != null ? Boolean(row.is_staff) : undefined,
    updatedAt: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

export async function getAdminUsers(
  token: string,
  params?: { search?: string; page?: number },
): Promise<ApiResponse<Paginated<AdminUserRow>>> {
  const q = new URLSearchParams();
  if (params?.search && params.search.trim() !== '') q.set('search', params.search.trim());
  if (params?.page != null && params.page > 0) q.set('page', String(params.page));
  const qs = q.toString();
  const path = qs ? `/admin/users/?${qs}` : '/admin/users/';
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>(path, {
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      const paged = parsePaginated(res.data, r => adminUserFromApi(r));
      if (paged) return { data: paged };
      return { error: { message: 'Invalid paginated response' } };
    }),
  );
}

export async function getAdminUser(token: string, id: number): Promise<ApiResponse<AdminUserRow>> {
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>(`/admin/users/${id}/`, {
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      return { data: adminUserFromApi(res.data) };
    }),
  );
}

export async function patchAdminUser(
  token: string,
  id: number,
  body: Record<string, unknown>,
): Promise<ApiResponse<AdminUserRow>> {
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>(`/admin/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      return { data: adminUserFromApi(res.data) };
    }),
  );
}

export async function getAdminCurrencies(
  token: string,
  page?: number,
): Promise<ApiResponse<Paginated<ApiCurrency>>> {
  const q = page != null && page > 0 ? `?page=${page}` : '';
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>(`/admin/currencies/${q}`, {
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      const paged = parsePaginated(res.data, r => currencyFromApi(r));
      if (paged) return { data: paged };
      return { error: { message: 'Invalid paginated response' } };
    }),
  );
}

export async function createAdminCurrency(
  token: string,
  body: Record<string, unknown>,
): Promise<ApiResponse<ApiCurrency>> {
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>('/admin/currencies/', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      return { data: currencyFromApi(res.data) };
    }),
  );
}

export async function patchAdminCurrency(
  token: string,
  id: number,
  body: Record<string, unknown>,
): Promise<ApiResponse<ApiCurrency>> {
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>(`/admin/currencies/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      return { data: currencyFromApi(res.data) };
    }),
  );
}

export async function deleteAdminCurrency(token: string, id: number): Promise<ApiResponse<void>> {
  return withTokenRetry(token, t =>
    request<unknown>(`/admin/currencies/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      return { data: undefined };
    }),
  );
}

export type AdminRateQuote = {
  id: number;
  slug: string;
  rate: number;
  isActive: boolean;
  updatedAt: string;
};

function rateQuoteFromApi(row: Record<string, unknown>): AdminRateQuote {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    rate: Number(row.rate),
    isActive: Boolean(row.is_active),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export async function getAdminRateQuotes(
  token: string,
  page?: number,
): Promise<ApiResponse<Paginated<AdminRateQuote>>> {
  const q = page != null && page > 0 ? `?page=${page}` : '';
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>(`/admin/rate-quotes/${q}`, {
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      const paged = parsePaginated(res.data, r => rateQuoteFromApi(r));
      if (paged) return { data: paged };
      return { error: { message: 'Invalid paginated response' } };
    }),
  );
}

export async function patchAdminRateQuote(
  token: string,
  id: number,
  body: { rate?: number; is_active?: boolean },
): Promise<ApiResponse<AdminRateQuote>> {
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>(`/admin/rate-quotes/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        rate: body.rate,
        is_active: body.is_active,
      }),
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      return { data: rateQuoteFromApi(res.data) };
    }),
  );
}

export async function createAdminRateQuote(
  token: string,
  body: { slug: string; rate: number; is_active?: boolean },
): Promise<ApiResponse<AdminRateQuote>> {
  return withTokenRetry(token, t =>
    request<Record<string, unknown>>('/admin/rate-quotes/', {
      method: 'POST',
      body: JSON.stringify({
        slug: body.slug,
        rate: String(body.rate),
        is_active: body.is_active ?? true,
      }),
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      if (res.data == null) return { error: { message: 'Empty response' } };
      return { data: rateQuoteFromApi(res.data) };
    }),
  );
}

export async function deleteAdminRateQuote(token: string, id: number): Promise<ApiResponse<void>> {
  return withTokenRetry(token, t =>
    request<unknown>(`/admin/rate-quotes/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.error) return res;
      return { data: undefined };
    }),
  );
}

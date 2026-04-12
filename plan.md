# Kryptera — Feature extension plan

This document describes how to extend the existing money transfer application (Django REST + SimpleJWT + React/Vite) **without rebuilding from scratch**. Implementation should follow the phases at the end.

---

## 1. Guiding principles

- **Extend, don’t replace:** keep `users`, `rates`, `transactions` apps; add models/views where gaps exist rather than rewriting the converter from scratch.
- **One API version:** keep everything under `/api/v1/` with clear **admin** vs **user** namespaces where helpful (e.g. `/admin/...` for admin-only aggregates, or reuse existing admin transaction routes and extend them).
- **RBAC:** continue using `User.is_admin` + `IsAdminUser`; ensure **every** admin-only endpoint checks it; user endpoints require `IsAuthenticated` only (unless public by design).
- **JWT:** use **refresh token lifetime = 30 days** (and optionally longer access or keep short access + refresh — see §4).

---

## 2. Data model extensions (backend)

### 2.1 Currencies (new)

- Add a **`rates.Currency`** model (or `core.Currency` if you prefer a tiny new app), e.g.:
  - `code` (3-letter, unique), `name`, `symbol`, `flag_emoji` optional, **`is_enabled`**, `sort_order`, timestamps.
- **Migration:** seed **RUB, ZMW, USD** from current `Transaction.Currency` choices so behavior stays consistent.
- **Later:** relax `Transaction.input_currency` / `result_currency` from enum to **FK or `CharField` validated against `Currency`** when corridor logic supports arbitrary pairs (can be phased: phase 1 still only allow enabled codes that exist in `Currency`).

### 2.2 Exchange rates (evolve from singleton)

- Today: single **`ExchangeRate`** row (four decimals).
- **Plan:** introduce **`ExchangeRateQuote`** (or named `RateLine`) rows, e.g.:
  - Stable **`slug`** (`rub_usd_buy`, `usd_zmw_sell`, …) **or** `from_currency` + `to_currency` + `side` + `rate` + **`is_active`**.
  - Admin **CRUD** + soft “disable” instead of hard delete where audit matters; **hard delete** only if no transactions reference snapshots (optional: store **snapshot rates on `Transaction`** at creation time — strongly recommended for compliance).
- **Migration:** copy current singleton values into the first set of quote rows; keep **`ExchangeRate.load()`** as a thin adapter that **reads from quotes** so `transactions.serializers.calculate_conversion` changes minimally in phase 1.
- **Audit:** extend or parallel **`RateAuditLog`** to log quote-level changes (who/when/old/new).

### 2.3 Recipients (new)

- New app **`recipients`** (or under `users`): **`Recipient`** model:
  - `user` (FK), `label` / nickname, `full_name`, `email`, `phone`, optional JSON or structured fields for bank/payout details, **`is_active`**, timestamps.
- **Transaction:** add nullable **`recipient`** FK; optional fields for “display snapshot” if recipient is edited later.

### 2.4 Users — suspend / deactivate

- **`is_active`** already exists (Django). Use it for **deactivation**; block login in **`LoginSerializer`** / auth flow with a clear message.
- Optional: add **`suspended_until`** or **`suspension_reason`** for “suspend” semantics and admin audit; document in API.

### 2.5 Transactions — history & detail

- Keep existing list/detail/POP/admin flows; add:
  - **Stored rate snapshot** on create (JSON or decimal fields) so history stays correct if rates change.
  - **Filters** on admin list: `created_after`, `created_before`, `user`, `status`, `input_currency`, `result_currency`, `search` (email / id / purpose).

---

## 3. REST API design (high level)

| Area | User (authenticated) | Admin (`is_admin`) |
|------|----------------------|---------------------|
| Currencies | `GET /currencies/` (enabled only) | Full CRUD under `/admin/currencies/` or `GET/POST/PATCH/DELETE /currencies/` with `IsAdminUser` |
| Rate quotes | `GET` aggregated “effective rates” for UI (same shape as today or extended) | List/create/update/delete (or deactivate) quotes + audit |
| Recipients | CRUD `/recipients/` scoped to `request.user` | Optional read-only list per user for support |
| Transactions | List own + `GET` detail + create (existing) + optional `recipient_id` | Existing admin list/detail **+ filters + pagination + search**; dashboard stats |
| Auth | Register/login/refresh/me; **enforce inactive user** | Same |
| Dashboard | — | `GET /admin/dashboard/stats/` (counts, volumes optional) |

- **Pagination:** reuse DRF `PageNumberPagination` (already global `PAGE_SIZE=20`); add **`AdminUserPagination`** / **`AdminTransactionPagination`** if different page sizes are needed.
- **Search:** `filter_backends` + `SearchFilter` on user and transaction admin viewsets; date filters via `django-filter` or manual `query_params` validation.

---

## 4. JWT & “30 days” (authentication)

- Set **`REFRESH_TOKEN_LIFETIME = 30 days`** (requirement).
- Keep **access token** reasonably short (e.g. 15–60 minutes) for security; frontend already refreshes or can be extended to refresh on 401.
- Optional production hardening: **`rest_framework_simplejwt.token_blacklist`** for logout/revocation (extra migration + settings) — treat as **phase 2** if not in scope for first delivery.

---

## 5. Backend implementation phases

### Phase A — Foundation

- Migrations: `Currency`, `ExchangeRateQuote` (+ data migration from singleton), `Recipient`, transaction snapshot + `recipient` FK, optional user suspension fields.
- Service layer: **`rates.services.effective_rates()`** used by serializers and public `GET /rates/`.

### Phase B — Admin APIs

- Viewsets/routers or explicit paths for currencies, rate quotes, users (list/detail/patch `is_active`), transactions (filtered list + detail), dashboard stats.
- Centralized **exception handling** / consistent error JSON (DRF default is fine; document field errors).

### Phase C — User APIs

- Recipients CRUD + link `recipient_id` on transaction create (validate recipient belongs to user).
- Transaction detail endpoint for users (already have `GET /<id>/`; enrich response with breakdown + snapshot).
- Public/enabled currency list for converter UI.

### Phase D — Tests & docs

- Extend `users`, `rates`, `transactions` tests for new permissions and filters.
- Short **API summary** in existing README (optional).

---

## 6. Frontend plan (React)

- **Routing:** add `/admin` dashboard **shell** (tabs or sub-routes): Overview (stats), Rates, Currencies, Users, Transactions — **guard with `user.isAdmin`** (redirect or 403 message).
- **Admin UI:** tables with pagination controls, filters (date range, status, user email search), modals or side panels for edit/create; reuse existing `Card`, `Button`, `Input` patterns.
- **User UI:**
  - **Recipients** page: list / add / edit / delete.
  - **Transaction detail** page or drawer from Activity.
  - **Converter:** load **enabled currencies** + effective rates from API; still support current corridors first, then generalize if backend exposes pairs.
- **API client:** extend `api.ts` with admin + recipient endpoints; keep snake_case ↔ camelCase mappers consistent.
- **Auth:** after backend JWT change, ensure **refresh** is used so “30 days” matches product expectation.

---

## 7. Security & validation checklist

- All admin routes: **`IsAdminUser`** (and never trust client `is_admin` from body).
- Recipients: **queryset filtered by `user=request.user`** on all writes.
- Deactivated users: **cannot obtain new tokens**; existing access expires naturally.
- File uploads: keep existing POP validation; any new uploads follow same rules.
- **Settings:** move DB credentials and `SECRET_KEY` to **environment variables** (not in repo) as part of “production-ready” hardening (parallel task).

---

## 8. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Changing rates breaks old txs | Store **rate snapshot** on each transaction at creation |
| Large scope | Ship **Phase A+B** (admin + models) then **C** (recipients + user detail) |
| Frontend overload | Admin dashboard **incremental**: stats + tx filters first, then currencies CRUD |

---

## 9. Decisions to confirm before implementation

1. **30 days** = **refresh token** lifetime (recommended), not necessarily access token.
2. **Rate model:** prefer **quote rows with slugs** (minimal change to conversion math) vs **full arbitrary pairs** in v1.
3. **Recipient** fields: start with **name, notes** + optional JSON for bank details?
4. **Admin UI:** single **dashboard area** under `/admin` with sub-sections — acceptable?

---

## 10. Order of execution

Proceed in order: **Phase A → B → C → D** (§5), aligned with frontend milestones in §6.

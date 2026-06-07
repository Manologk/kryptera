# CryptoFlux Trading — Django Backend

REST API for the CryptoFlux currency exchange platform (₽ ↔ ZMW).

## Stack

- **Python 3.12** · **Django 6** · **Django REST Framework**
- **SimpleJWT** — access + refresh token auth
- **django-cors-headers** — CORS for React frontend
- **SQLite** (dev) / **MySQL or PostgreSQL** (prod)

---

## Quick Start

```bash
# 1. Clone and enter
cd cryptoflux_api

# 2. Create virtualenv
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env — set SECRET_KEY at minimum

# 5. Migrate and seed
python manage.py migrate
python manage.py seed           # creates admin user + default rates

# 6. Run
python manage.py runserver
# API at http://localhost:8000/api/v1/
```

---

## API Reference

All endpoints are under `/api/v1/`. Protected routes require:
```
Authorization: Bearer <access_token>
```

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register/` | Public | Create account → returns tokens + user |
| POST | `/auth/token/` | Public | Login → returns tokens + user |
| POST | `/auth/token/refresh/` | Public | Refresh access token |
| GET | `/auth/me/` | User | Get own profile |
| PATCH | `/auth/me/` | User | Update own profile |

**Register / Login response shape:**
```json
{
  "access": "eyJ...",
  "refresh": "eyJ...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "Jane Doe",
    "is_admin": false,
    "kyc_status": "not_submitted",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

---

### Exchange Rates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/rates/` | Public | Get current rates |
| PUT | `/rates/` | Admin | Update all four rates |
| GET | `/rates/history/` | Admin | Rate change audit log |

**Rate object:**
```json
{
  "ruble_to_usd_buying": "95.500000",
  "usd_to_kwacha_selling": "27.500000",
  "kwacha_to_usd_buying": "28.000000",
  "usd_to_ruble_selling": "96.000000",
  "updated_at": "2026-01-01T12:00:00Z"
}
```

---

### Transactions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/transactions/` | User | List own transactions (paginated) |
| POST | `/transactions/` | User | Create transaction |
| GET | `/transactions/<id>/` | Owner | Get own transaction |
| POST | `/transactions/<id>/pop/` | Owner | Upload proof of payment |
| GET | `/transactions/admin/` | Admin | List all transactions |
| GET/PATCH | `/transactions/admin/<id>/` | Admin | View or update any transaction |

**Create transaction — request:**
```json
{
  "mode": "russia-zambia",
  "input_amount": "10000",
  "purpose": "Family support"
}
```

**Transaction response:**
```json
{
  "id": "2bab0181-f547-4ff0-a6a9-d5788c8271c6",
  "user_email": "user@example.com",
  "mode": "russia-zambia",
  "input_amount": "10000.000000",
  "input_currency": "RUB",
  "result_amount": "2750.000000",
  "result_currency": "ZMW",
  "commission_rate": "0.0450",
  "purpose": "Family support",
  "status": "pop_not_uploaded",
  "pop_file": null,
  "receipt_file": null,
  "admin_note": "",
  "created_at": "2026-01-01T12:00:00Z",
  "updated_at": "2026-01-01T12:00:00Z"
}
```

**Transaction status flow:**
```
pop_not_uploaded → pending_verification → completed
                                        ↘ rejected
```

**Admin status update:**
```json
PATCH /transactions/admin/<id>/
{
  "status": "completed",
  "admin_note": "Payment confirmed. Receipt issued."
}
```

**Upload POP (multipart/form-data):**
```
POST /transactions/<id>/pop/
Content-Type: multipart/form-data
pop_file=<file>    (JPEG, PNG, WEBP, or PDF — max 10 MB)
```

---

## Project Structure

```
cryptoflux_api/
├── config/
│   ├── settings.py          # All configuration
│   ├── urls.py              # Root URL (admin + /api/v1/)
│   └── api_urls.py          # Versioned API routes
│
├── users/                   # Custom User model + auth views
│   ├── models.py            # User (email auth, KYC fields)
│   ├── serializers.py       # Register, Login, User, TokenPair
│   ├── views.py             # RegisterView, LoginView, MeView
│   ├── admin.py             # Django admin registration
│   ├── tests.py             # Auth endpoint tests (6 tests)
│   └── management/commands/
│       └── seed.py          # python manage.py seed
│
├── rates/                   # Exchange rates (singleton + audit)
│   ├── models.py            # ExchangeRate (singleton), RateAuditLog
│   ├── serializers.py       # ExchangeRateSerializer, AuditLogSerializer
│   ├── views.py             # ExchangeRateView, RateAuditLogView
│   ├── permissions.py       # IsAdminUser permission class
│   ├── urls.py
│   ├── admin.py
│   └── tests.py             # Rate endpoint tests (7 tests)
│
├── transactions/            # Conversion transactions + POP upload
│   ├── models.py            # Transaction (UUID PK, file uploads)
│   ├── serializers.py       # TransactionSerializer, PopUploadSerializer
│   ├── views.py             # User + admin views
│   ├── urls.py
│   ├── admin.py
│   └── tests.py             # Transaction tests (11 tests)
│
├── requirements.txt
├── .env.example
├── manage.py
└── README.md
```

---

## Tests

```bash
python manage.py test --verbosity=2
# 24 tests · 0 failures
```

| Module | Tests | Coverage |
|--------|-------|----------|
| `users` | 6 | Register, login, bad creds, /me auth |
| `rates` | 7 | Public GET, admin PUT, zero rejection, audit log |
| `transactions` | 11 | Math accuracy, create, ownership, admin ops |

---

## Connecting to the React Frontend

The Vite dev server proxies `/api` → `http://localhost:8000` (configured in `vite.config.ts`).

In `src/services/api.ts`, uncomment the `request(...)` calls and remove the localStorage fallbacks — the types and function signatures are already aligned with this API.

---

## Email notifications

Outbound mail is sent via **Brevo SMTP relay**. Configure in `.env`:

| Variable | Description |
|----------|-------------|
| `EMAIL_HOST` | `smtp-relay.brevo.com` |
| `EMAIL_PORT` | `587` (TLS) |
| `EMAIL_HOST_USER` | Brevo SMTP login (e.g. `xxxx@smtp-brevo.com`) |
| `EMAIL_HOST_PASSWORD` | Brevo **SMTP key** (SMTP & API → SMTP — not your API key) |
| `EMAIL_USE_TLS` | `True` |
| `EMAIL_USE_SSL` | `False` |
| `DEFAULT_FROM_EMAIL` | Verified sender in Brevo (Senders & IPs) |
| `REPLY_TO_EMAIL` | Reply-To header (default `support@kryptera.cc`) |
| `ADMIN_NOTIFICATION_EMAILS` | Comma- or semicolon-separated admin inboxes — **each address gets its own copy** of KYC/POP alerts |
| `FRONTEND_URL` | Public app URL for links in emails |

Verify your domain/sender in Brevo and add SPF/DKIM DNS records before production.

**Test SMTP** (sends synchronously, no Celery):

```bash
python manage.py send_test_email you@example.com
```

**Multiple admin recipients** — add every ops inbox to one line, for example:

```env
ADMIN_NOTIFICATION_EMAILS=emmanuelsiame29@gmail.com,ops@kryptera.cc,finance@kryptera.cc
```

**Celery worker** must be running so notification tasks send after API requests commit. Restart `django` and `celery_worker` after changing `.env`.

Events: user KYC submit (user ack + admin alert — review doc in dashboard only), KYC approve/reject (user), POP upload (admin with file), transaction completed (user with delivery proof).

---

## Production Checklist

- [ ] Set a real `SECRET_KEY` in `.env`
- [ ] Set `DEBUG=False`
- [ ] Switch `DB_ENGINE` to MySQL or PostgreSQL
- [ ] Configure `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`
- [ ] Run `python manage.py collectstatic`
- [ ] Serve with **gunicorn** behind **nginx**
- [ ] Set up media file storage (S3 or similar) for POP uploads
- [ ] Enable HTTPS

---

## Planned Extensions (stubs already in place)

- **KYC** — `User.kyc_status` + `kyc_doc` fields ready; add upload endpoint
- **Receipt generation** — `Transaction.receipt_file` field ready
- **Email notifications** — implemented via `notifications` app + Celery
- **WebSocket rates** — swap polling for live push via Django Channels

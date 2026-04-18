# Kryptera Trading — Frontend

React + TypeScript frontend for the Kryptera currency exchange platform (₽ ↔ ZMW).

## Stack

- **React 18** + **TypeScript**
- **React Router v6** for client-side routing
- **Vite** for dev server and builds
- **Wise-inspired design system** (see `DESIGN.md`)

## Getting Started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview production build
```

## Project Structure

```
src/
├── types/          # All TypeScript interfaces and types
├── constants/      # App-wide constants (commission rate, currency meta, API base)
├── services/
│   └── api.ts      # API service layer — stubbed; swap for real Django calls
├── context/
│   └── RatesContext.tsx   # Exchange rates global state
├── hooks/
│   └── useConverter.ts    # Conversion logic and state
├── components/
│   ├── ui/         # Button, Input, Card, Badge, Alert
│   ├── layout/     # Nav, Layout, PageHeader
│   └── ContactWidget.tsx
├── pages/
│   ├── ConverterPage.tsx
│   └── AdminPage.tsx
├── styles/
│   └── globals.css        # Design tokens (CSS variables)
└── App.tsx                # Router + providers
```

## Connecting to Django Backend

The `src/services/api.ts` file is the single integration point. Each function
has a TODO comment with the real endpoint. To go live:

1. Uncomment the `request(...)` call in each function.
2. Remove the localStorage fallback.
3. Set `VITE_API_BASE` in `.env` if the API is on a different origin.
4. Add the auth token to requests (see `getMe`, `getTransactions`).

## Adding New Features

### New page
1. Create `src/pages/MyPage.tsx`
2. Add `<Route path="/my-page" element={<MyPage />} />` in `App.tsx`
3. Add a nav item in `src/components/layout/Nav.tsx`

### New API endpoint
Add a function to `src/services/api.ts` following the existing pattern.

### New types
Add interfaces to `src/types/index.ts`.

## Planned Features (see API stubs in `services/api.ts`)

- [ ] User authentication (JWT, login/register pages)
- [ ] Transaction history with status tracking
- [ ] Proof of Payment (POP) upload
- [ ] KYC document submission
- [ ] Admin: user management
- [ ] Admin: rate change audit log
- [ ] Real-time rates via WebSocket or polling

## Design System

See `DESIGN.md` for full token reference. Key values:

| Token | Value |
|-------|-------|
| Primary green | `#9fe870` |
| Background | `#f5f7f2` |
| Surface | `#ffffff` |
| Text | `#0e0f0c` |
| Font | Plus Jakarta Sans |
| Mono | JetBrains Mono |

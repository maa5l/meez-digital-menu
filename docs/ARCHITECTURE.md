# Architecture

## Overview

Meez is a **Vite + React SPA** backed entirely by **Supabase** (Auth, Postgres, RLS, RPCs, Realtime). There is no separate application API required for production.

```
┌──────────────┐     HTTPS      ┌──────────────┐     ┌─────────────────────┐
│ Browser/iPad │ ◄────────────► │ Nginx / CDN  │     │ Supabase            │
│  React SPA   │                │  (static)    │     │ Auth + Postgres RPC │
└──────────────┘                └──────────────┘     └─────────────────────┘
```

Optional: `server/` Express health check on port 3001 (not required for the dashboard or kiosk).

## Frontend structure

```
src/
├── app/           # Routes, providers, auth bootstrap
├── components/    # UI, menu, dashboard, admin
├── config/        # env, subscription, support
├── hooks/
├── lib/           # logger, errors, image processing
├── middleware/    # Auth, subscription, admin guards
├── pages/         # Landing, dashboard, admin, menu display
├── security/      # session mirror, sanitize, storage
├── services/      # Supabase RPC wrappers
├── types/
└── validations/   # Zod schemas
```

## Layer responsibilities

| Layer | Responsibility |
|-------|----------------|
| Pages | UI composition |
| Hooks | Shared state |
| Services | Business calls via Supabase RPC |
| Validations | Client-side input checks (server enforces via RPC/RLS) |
| Security | Session mirror, sanitization, local storage helpers |

## Backend (Supabase)

All authoritative logic lives in Postgres:

- **RLS** on `profiles`, `subscriptions`, `audit_logs`, pairing sessions
- **RPC-only** access for `venues`, `device_activations`, admin tables
- **SECURITY DEFINER** functions validate `auth.uid()`, subscription state, and admin roles
- **Kiosk** endpoints use rate limiting and device-code gates

See `docs/CORE_PLATFORM_SECURITY.md` and `docs/MANUAL_SUBSCRIPTION.md`.

## Admin panel

Routes under `/admin/*` are gated by `AdminProtectedRoute` (UI) and `admin_require_role()` (database).

Roles: `super_admin` > `admin` > `support` (read-only for mutations).

## Subscription model

- 7-day trial created on signup (server-enforced)
- Manual activation by platform admin
- No online billing in the frontend or database RPC surface

## Deployment

See `docs/DEPLOYMENT.md`. Vercel/nginx serves the SPA; configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

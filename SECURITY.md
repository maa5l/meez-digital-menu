# Security Policy

## Reporting vulnerabilities

Contact: security@meez.app (replace with your operational address).

## Principles

- **No secrets in the frontend** — only the Supabase anon/publishable key in `VITE_*` variables.
- **Server enforcement** — subscription, admin, device, and venue writes go through Supabase RPCs with RLS; UI guards are not sufficient alone.
- **Session** — Supabase Auth JWT is authoritative; a minimal mirror may exist in `sessionStorage` (not `localStorage`).
- **Input validation** — Zod schemas in `src/validations/`; Postgres validates again in RPCs.
- **Output sanitization** — `src/security/sanitize.ts` for user-generated HTML/color values.
- **Route guards** — `ProtectedRoute`, `SubscriptionGate`, `AdminProtectedRoute`.
- **Rate limiting** — kiosk RPC rate limits in Postgres; optional Express limiter on `server/`.
- **CSP + headers** — `index.html`, `nginx.conf`, and Express Helmet.

## Admin access

- Roles stored in `admin_users`; table has no direct client access.
- Mutations require `admin_require_role('admin')` inside `admin_update_subscription`.
- Bootstrap first admin with `supabase/scripts/bootstrap-admin.sql`.

## Secrets management

1. Copy `.env.example` to `.env.local`.
2. Never commit `.env` files.
3. Use CI/CD secret stores for production builds.

## Payments

Online billing has been removed. Subscription activation is manual via the admin panel.

## Dependency audit

```bash
npm audit
npm audit fix
```

See also `docs/CORE_PLATFORM_SECURITY.md` and `docs/PRODUCTION_READINESS.md`.

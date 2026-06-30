# Production Readiness Checklist

Last updated: final release pass.

## Build quality

- [x] `npm run build` succeeds
- [x] `npx tsc --noEmit` — zero TypeScript errors
- [x] `npm run lint` — zero ESLint errors and warnings
- [ ] No console errors in dashboard, menu, and admin flows (manual QA on staging)

## npm audit

- Fixed 18/20 vulnerabilities via `npm audit fix`
- **2 remaining:** esbuild/vite dev-server (moderate/high) — affects `npm run dev` only, not production bundles
- Vite 8 upgrade resolves these; defer to avoid breaking change

## Supabase

- [ ] All migrations applied (through `20260614150000`)
- [ ] Fix migration `20260614130000` if error `25006` occurred
- [ ] First admin bootstrapped via `supabase/scripts/bootstrap-admin.sql`
- [ ] `VITE_ENABLE_MOCK_AUTH=false` in production
- [ ] Service role key **never** in `VITE_*` env vars

Regenerate types when linked: `npm run supabase:types`  
Manual sync: `src/lib/supabase/database.types.ts`

## Security

- [x] RLS + RPC-only writes configured in migrations
- [x] Admin mutations require `admin` role in DB
- [x] CSP aligned with nginx
- [ ] Supabase Auth email confirmation policy matches rollout

## Documentation

- [x] `docs/ARCHITECTURE.md`
- [x] `docs/DEPLOYMENT.md`
- [x] `docs/ADMIN_GUIDE.md`
- [x] `docs/SUBSCRIPTION_FLOW.md`
- [x] `docs/API_DOCUMENTATION.md`
- [x] `docs/MANUAL_SUBSCRIPTION.md`

## User flows (manual QA on staging)

See `docs/SUBSCRIPTION_FLOW.md` and `docs/ADMIN_GUIDE.md`.

## Legacy SQL

Removed from repo root: `FIX_*.sql`, `patches/`. See `supabase/scripts/archive/README.md`.

## Launch blockers

1. Apply migrations on production Supabase
2. Bootstrap admin user
3. Staging QA on real iPad hardware
4. Optional: E2E test suite (Playwright)

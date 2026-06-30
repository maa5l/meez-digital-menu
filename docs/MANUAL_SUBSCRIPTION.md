# Manual Subscription & Admin Panel

## Trial (7 days)

- Starts automatically on account creation (`handle_new_profile_subscription` / `ensure_subscription_for_owner`).
- Enforced server-side in `refresh_subscription_state` and `resolve_subscription_access`.
- After expiry: `status = expired`, devices deactivated, kiosk and dashboard blocked.

## Customer flow

1. Register → 7-day trial (1 screen).
2. Trial ends → blocked UI with WhatsApp / email contact.
3. Customer pays offline → admin activates via `/admin`.

## Apply migration

```bash
npm run supabase:db:push
```

Migration: `supabase/migrations/20260614120000_manual_subscription_admin.sql`

## Bootstrap first admin

1. Create user in Supabase Auth (or use existing).
2. Run `supabase/scripts/bootstrap-admin.sql` in SQL Editor (edit email).
3. Sign in and open `/admin`.

## Admin roles

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access |
| `admin` | Activate, suspend, extend, device limits, notes |
| `support` | View customers and stats (read-only) |

## Admin RPCs

- `get_my_admin_profile`
- `admin_get_dashboard_stats`
- `admin_list_customers`
- `admin_get_customer`
- `admin_update_subscription` (actions: activate, suspend, disable, extend, reset_trial, set_device_limit)

## Removed

Online billing (Moyasar, Stripe, checkout API, webhooks, `process_billing_webhook`).

## Environment

```env
VITE_SUPPORT_EMAIL=support@meez.app
VITE_SUPPORT_WHATSAPP=966500000000
```

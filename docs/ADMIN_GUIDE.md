# Admin Guide

## Access

1. Apply all Supabase migrations (through `20260614150000`).
2. Run `supabase/scripts/bootstrap-admin.sql` with your admin email.
3. Sign in at `/auth`, then open `/admin`.

## Roles

| Role | Access |
|------|--------|
| `support` | Dashboard stats, customer list, customer detail (read-only) |
| `admin` | All support + subscription mutations |
| `super_admin` | Same as admin (reserved for future platform settings) |

Role checks happen in Postgres via `admin_require_role()` — the UI is not authoritative.

## Customer management

### Search and filter

- `/admin/customers` — search by name, email, or venue name
- Filter by subscription status (trial, active, expired, suspended)
- Pagination: 25 customers per page

### Subscription actions (admin+ only)

| Action | Effect |
|--------|--------|
| `activate` | Sets status `active`, optional end date and device limit |
| `suspend` | Suspends subscription, deactivates all devices |
| `disable` | Cancels subscription, deactivates devices |
| `extend` | Updates `subscription_ends_at`, reactivates if expired |
| `reset_trial` | Resets to 7-day trial |
| `set_device_limit` | Updates screen/device limit |

All actions are logged in `admin_logs` and `subscription_history`.

## Bootstrap new admin

```sql
-- supabase/scripts/bootstrap-admin.sql
INSERT INTO admin_users (user_id, role, email, full_name)
SELECT id, 'super_admin', email, raw_user_meta_data->>'full_name'
FROM auth.users WHERE email = 'your@email.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin', is_active = true;
```

## Security notes

- Never expose the Supabase service role key in the frontend.
- Admin tables have no direct client access — only RPCs.
- Support users cannot call `admin_update_subscription` (DB enforced).

# API Reference (Supabase RPCs)

The production API is **Supabase Postgres RPCs** called from the React app via `@supabase/supabase-js`.

There is no separate REST API required for dashboard, admin, or kiosk flows.

## Authentication

All owner/admin RPCs require a valid Supabase session (`auth.uid()`).

## Owner / dashboard

| RPC | Purpose |
|-----|---------|
| `ensure_profile` | Create/update profile on login |
| `ensure_venue_for_owner` | Link venue row to owner |
| `ensure_subscription_for_owner` | Create 7-day trial if missing |
| `get_owner_subscription` | Subscription + access flags |
| `get_dashboard_preview_venue` | Venue JSON for preview (subscription-gated) |
| `update_venue_data` | Authoritative venue JSONB writes |
| `get_owner_venue` | Read venue for owner |
| `list_owner_devices` | Active devices |
| `deactivate_all_my_devices` | Deactivate all owner devices |

## Device pairing / licensing

| RPC | Purpose |
|-----|---------|
| `create_device_pairing_session` | Start pairing from dashboard |
| `claim_device_pairing_session` | iPad claims code |
| `get_device_pairing_session_code` | Dashboard polls for code |
| `create_device_verification_code` | Verification flow |
| `register_device_with_license` | Register device with subscription check |
| `activate_device_with_license` | Activate licensed device |

## Kiosk (public / device)

| RPC | Purpose |
|-----|---------|
| `get_kiosk_venue` | Menu payload by device code |
| `get_kiosk_state` | Kiosk state + rate limit gate |
| `check_kiosk_access` | Access check |
| `record_device_heartbeat` | Heartbeat |

## Platform admin

| RPC | Min role | Purpose |
|-----|----------|---------|
| `get_my_admin_profile` | authenticated | Admin role probe |
| `admin_get_dashboard_stats` | support | Dashboard metrics |
| `admin_list_customers` | support | Customer search/list |
| `admin_get_customer` | support | Customer detail + history |
| `admin_update_subscription` | admin | activate/suspend/extend/trial reset |

Role ranks: `support` < `admin` < `super_admin`.

## Service role only (never expose to browser)

- `refresh_subscription_state`
- `resolve_subscription_access`
- `write_audit_log`
- `deactivate_all_devices_for_owner`
- `process_billing_webhook` (removed in manual subscription migration)

## Migrations

Schema and RPC definitions live in `supabase/migrations/`. Apply in order through the latest file before production.

See `docs/MANUAL_SUBSCRIPTION.md` for admin bootstrap and trial policy.

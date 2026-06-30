# Subscription & Trial Flow

## Overview

Meez uses **manual subscription activation**. There is no online billing in the application.

## Trial (7 days)

1. User registers → `handle_new_profile_subscription` trigger creates subscription with `status = trial`.
2. `trial_ends_at = now() + 7 days`, `device_limit = 1`.
3. Owner gets dashboard + kiosk access while `status IN (trial, active)`.
4. `get_owner_subscription` RPC refreshes state and returns access flags.

## Trial expiration

1. `refresh_subscription_state` runs on subscription fetch.
2. If `trial_ends_at < now()` → status becomes `expired`.
3. All devices deactivated via `deactivate_all_devices_for_owner`.
4. Audit log: `subscription.expired`.
5. Frontend `SubscriptionGate` redirects to `/subscription-expired`.

## Manual activation (admin)

1. Admin opens `/admin/customers/:id`.
2. Calls `admin_update_subscription` with action `activate`.
3. Sets `manual_activation = true`, `activated_by`, optional `subscription_ends_at`.
4. History recorded in `subscription_history`, action in `admin_logs`.
5. Owner regains dashboard and can add devices per `device_limit`.

## Access flags (from `resolve_subscription_access`)

| Flag | trial | active | expired/suspended |
|------|-------|--------|-------------------|
| `dashboard_allowed` | yes | yes | no |
| `kiosk_allowed` | yes | yes | no |
| `can_add_devices` | yes* | yes* | no |

*Only if active device count < screen limit.

## Owner contact on expiry

Configure in environment:

- `VITE_SUPPORT_EMAIL`
- `VITE_SUPPORT_WHATSAPP`

Shown on `SubscriptionExpired` page.

## RPC reference

See `docs/API_DOCUMENTATION.md` for full RPC list.

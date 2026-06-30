# Subscription Enforcement

> **Updated:** Manual subscription model. See [SUBSCRIPTION_FLOW.md](./SUBSCRIPTION_FLOW.md) and [MANUAL_SUBSCRIPTION.md](./MANUAL_SUBSCRIPTION.md).

Online billing (Moyasar/Stripe) has been removed. Enforcement is server-side via:

- `get_owner_subscription` / `resolve_subscription_access`
- `SubscriptionGate` (UI layer only)
- Kiosk RPCs (`get_kiosk_venue`, `check_kiosk_access`)

Legacy payment documentation in this file is obsolete.

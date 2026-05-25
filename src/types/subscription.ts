/** حالات الاشتراك — يجب أن تطابق public.subscription_status في Postgres */
export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "grace_period"
  | "suspended"
  | "expired"
  | "canceled";

export type BillingCycle = "monthly" | "yearly";

export type SubscriptionBanner = "trial" | "warning" | "grace" | "suspended" | "expired" | "canceled" | "error" | null;

/** نتيجة resolve_subscription_access من الخادم */
export type SubscriptionAccess = {
  allowed: boolean;
  kiosk_allowed: boolean;
  dashboard_edit_allowed: boolean;
  can_add_devices: boolean;
  status: SubscriptionStatus;
  reason: string | null;
  screen_count: number;
  active_device_count: number;
  grace_ends_at?: string | null;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  billing_cycle?: BillingCycle;
  banner: SubscriptionBanner;
};

export type OwnerSubscription = {
  owner_id: string;
  status: SubscriptionStatus;
  screen_count: number;
  billing_cycle: BillingCycle;
  price_per_screen_monthly: number;
  price_per_screen_yearly: number;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  grace_ends_at: string | null;
  canceled_at: string | null;
  access: SubscriptionAccess;
};

export type KioskAccessCheck = {
  allowed: boolean;
  registered: boolean;
  reason?: string;
  access?: SubscriptionAccess;
  owner_id?: string;
};

export type DeviceActivationResult = {
  ok: boolean;
  code?: string;
  error?: string;
  access?: SubscriptionAccess;
};

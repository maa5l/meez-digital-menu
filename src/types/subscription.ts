/** حالات الاشتراك — يجب أن تطابق public.subscription_status في Postgres */
export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "grace_period"
  | "suspended"
  | "expired"
  | "canceled";

export type SubscriptionBanner = "trial" | "suspended" | "expired" | "canceled" | "error" | null;

/** نتيجة resolve_subscription_access من الخادم */
export type SubscriptionAccess = {
  allowed: boolean;
  kiosk_allowed: boolean;
  dashboard_allowed: boolean;
  dashboard_edit_allowed: boolean;
  can_add_devices: boolean;
  status: SubscriptionStatus;
  reason: string | null;
  screen_count: number;
  device_limit?: number;
  active_device_count: number;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  subscription_started_at?: string | null;
  subscription_ends_at?: string | null;
  manual_activation?: boolean;
  banner: SubscriptionBanner;
};

export type OwnerSubscription = {
  owner_id: string;
  status: SubscriptionStatus;
  screen_count: number;
  device_limit: number;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  manual_activation: boolean;
  activated_at: string | null;
  notes: string | null;
  access: SubscriptionAccess;
};

export type KioskAccessCheck = {
  allowed: boolean;
  registered: boolean;
  reason?: string;
  access?: SubscriptionAccess;
  owner_id?: string;
  subscription_status?: SubscriptionStatus;
  menu_type?: string | null;
  venue_updated_at?: string | null;
  retry_after_seconds?: number;
};

export type DeviceActivationResult = {
  ok: boolean;
  code?: string;
  error?: string;
  access?: SubscriptionAccess;
};

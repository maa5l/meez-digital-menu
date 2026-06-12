import type {
  DeviceActivationResult,
  KioskAccessCheck,
  OwnerSubscription,
  SubscriptionAccess,
  SubscriptionStatus,
} from "@/types/subscription";
import { appEnv } from "@/config/env";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { cachedFetch } from "@/lib/request-cache";
import { logger } from "@/lib/logger";
import type { SubscriptionInfo } from "@/types/venue";
import { TRIAL_SUBSCRIPTION } from "@/lib/venue-store";
import { BILLING } from "@/config/billing";
import { fetchKioskState } from "@/services/venue/venue-supabase.service";

const GRACE_DAYS = 5;

function emptyAccess(status: SubscriptionStatus = "expired"): SubscriptionAccess {
  return {
    allowed: false,
    kiosk_allowed: false,
    dashboard_edit_allowed: false,
    can_add_devices: false,
    status,
    reason: `subscription_${status}`,
    screen_count: 0,
    active_device_count: 0,
    banner: status === "expired" ? "expired" : "error",
  };
}

/** قواعد الوصول — مرآة لـ resolve_subscription_access في SQL (للتطوير المحلي فقط) */
export function resolveAccessFromStatus(
  status: SubscriptionStatus,
  screenCount: number,
  activeDevices: number,
): SubscriptionAccess {
  const effectiveScreens =
    status === "trial" ? BILLING.trialMaxScreens : Math.max(0, screenCount);

  const kiosk_allowed = ["active", "trial", "past_due", "grace_period"].includes(status);
  const dashboard_edit_allowed = ["active", "trial"].includes(status);
  const can_add_devices =
    ["active", "trial"].includes(status) && activeDevices < effectiveScreens;

  const banner: SubscriptionAccess["banner"] =
    status === "past_due"
        ? "warning"
        : status === "grace_period"
          ? "grace"
          : status === "suspended"
            ? "suspended"
            : status === "expired"
              ? "expired"
              : status === "canceled"
                ? "canceled"
                : null;

  return {
    allowed: kiosk_allowed,
    kiosk_allowed,
    dashboard_edit_allowed,
    can_add_devices,
    status,
    reason: kiosk_allowed ? null : `subscription_${status}`,
    screen_count: effectiveScreens,
    active_device_count: activeDevices,
    banner,
  };
}

export function subscriptionInfoFromAccess(access: SubscriptionAccess): SubscriptionInfo {
  const plan =
    access.status === "trial"
      ? "تجربة مجانية"
      : access.status === "active"
        ? "باقة نشطة"
        : access.status === "grace_period"
          ? "فترة سماح"
          : access.status === "past_due"
            ? "دفع متأخر"
            : "غير نشط";

  const renewsOn = access.current_period_end
    ? new Date(access.current_period_end).toLocaleDateString("ar-SA")
    : access.grace_ends_at
      ? new Date(access.grace_ends_at).toLocaleDateString("ar-SA")
      : "—";

  let daysLeft = 0;
  const end = access.trial_ends_at ?? access.grace_ends_at ?? access.current_period_end;
  if (end) {
    daysLeft = Math.max(0, Math.ceil((Date.parse(end) - Date.now()) / 86400000));
  }

  return {
    plan,
    status: access.status,
    screens: access.active_device_count,
    maxScreens: access.screen_count,
    pricePerScreen: BILLING.pricePerScreenMonthly,
    renewsOn,
    daysLeft,
  };
}

function parseAccess(raw: unknown): SubscriptionAccess | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const status = o.status as SubscriptionStatus;
  if (!status) return null;
  return {
    allowed: Boolean(o.allowed),
    kiosk_allowed: Boolean(o.kiosk_allowed),
    dashboard_edit_allowed: Boolean(o.dashboard_edit_allowed),
    can_add_devices: Boolean(o.can_add_devices),
    status,
    reason: typeof o.reason === "string" ? o.reason : null,
    screen_count: Number(o.screen_count ?? 0),
    active_device_count: Number(o.active_device_count ?? 0),
    grace_ends_at: (o.grace_ends_at as string) ?? null,
    trial_ends_at: (o.trial_ends_at as string) ?? null,
    current_period_end: (o.current_period_end as string) ?? null,
    billing_cycle: o.billing_cycle as SubscriptionAccess["billing_cycle"],
    banner: (o.banner as SubscriptionAccess["banner"]) ?? null,
  };
}

export async function fetchOwnerSubscription(): Promise<OwnerSubscription | null> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) return null;

  const { data, error } = await getSupabase().rpc("get_owner_subscription");
  if (error) {
    logger.error("subscription.fetch_failed", { message: error.message });
    throw error;
  }

  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const access = parseAccess(row.access) ?? emptyAccess("trial");

  return {
    owner_id: String(row.owner_id ?? ""),
    status: (row.status as SubscriptionStatus) ?? access.status,
    screen_count: Number(row.screen_count ?? access.screen_count),
    billing_cycle: (row.billing_cycle as OwnerSubscription["billing_cycle"]) ?? "monthly",
    price_per_screen_monthly: Number(row.price_per_screen_monthly ?? 45),
    price_per_screen_yearly: Number(row.price_per_screen_yearly ?? 450),
    trial_ends_at: (row.trial_ends_at as string) ?? null,
    current_period_start: (row.current_period_start as string) ?? null,
    current_period_end: (row.current_period_end as string) ?? null,
    grace_ends_at: (row.grace_ends_at as string) ?? null,
    canceled_at: (row.canceled_at as string) ?? null,
    access,
  };
}

export async function ensureSubscriptionRecord(): Promise<void> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) return;
  const { error } = await getSupabase().rpc("ensure_subscription_for_owner");
  if (error) logger.error("subscription.ensure_failed", { message: error.message });
}

export async function checkKioskAccess(
  deviceCode: string,
  force = false,
): Promise<KioskAccessCheck> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    return { allowed: true, registered: true };
  }

  const normalized = deviceCode.trim().toUpperCase();
  const session = await getSupabase().auth.getSession();
  const isAuthenticated = Boolean(session.data.session?.user?.id);

  if (!isAuthenticated) {
    const state = await fetchKioskState(normalized, force);
    return {
      allowed: state.allowed,
      registered: state.registered,
      reason: state.reason,
      subscription_status: state.subscription_status as KioskAccessCheck["subscription_status"],
      menu_type: state.menu_type,
      venue_updated_at: state.venue_updated_at,
      retry_after_seconds: state.retry_after_seconds,
    };
  }

  return cachedFetch(
    `kiosk:access:${normalized}`,
    async () => {
      const { data, error } = await getSupabase().rpc("check_kiosk_access", {
        p_device_code: normalized,
      });

      if (error) {
        logger.error("subscription.kiosk_check_failed", { message: error.message });
        return { allowed: false, registered: false, reason: "check_failed" };
      }

      if (!data || typeof data !== "object") {
        return { allowed: false, registered: false, reason: "invalid_response" };
      }

      const row = data as Record<string, unknown>;
      return {
        allowed: Boolean(row.allowed),
        registered: Boolean(row.registered),
        reason: typeof row.reason === "string" ? row.reason : undefined,
        access: parseAccess(row.access) ?? undefined,
        owner_id: typeof row.owner_id === "string" ? row.owner_id : undefined,
      };
    },
    30_000,
    force,
  );
}

export async function activateDeviceWithLicense(
  code: string,
  menuType?: "products" | "crops",
  deviceName?: string,
): Promise<DeviceActivationResult> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    return { ok: true, code: code.trim().toUpperCase() };
  }

  const { data, error } = await getSupabase().rpc("register_device_with_license", {
    p_code: code.trim().toUpperCase(),
    p_menu_type: menuType ?? null,
    p_device_name: deviceName ?? null,
    p_app_env: "production",
  });

  if (error) {
    const message =
      typeof error.message === "string" && error.message.trim()
        ? error.message
        : "تعذّر تفعيل الجهاز في الخادم";
    logger.error("subscription.device_activate_failed", { message, code: error.code });
    return { ok: false, error: message };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: "invalid_response" };
  }

  const row = data as Record<string, unknown>;
  return {
    ok: Boolean(row.ok),
    code: typeof row.code === "string" ? row.code : undefined,
    error: typeof row.error === "string" ? row.error : undefined,
    access: parseAccess(row.access) ?? undefined,
  };
}

export async function recordDeviceHeartbeat(deviceCode: string): Promise<boolean> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) return true;

  const normalized = deviceCode.trim().toUpperCase();
  // check_kiosk_access يحدّث last_seen_at — لا حاجة لاستدعاء record_device_heartbeat
  const check = await checkKioskAccess(normalized);
  return check.allowed;
}

/** وصول محلي من SubscriptionInfo في venue (mock / بدون Supabase) */
export function accessFromVenueSubscription(
  sub: SubscriptionInfo,
  activeDevices: number,
): SubscriptionAccess {
  const status = (sub.status as SubscriptionStatus) || "trial";
  return resolveAccessFromStatus(status, sub.maxScreens, activeDevices);
}

export function defaultTrialAccess(): SubscriptionAccess {
  return resolveAccessFromStatus("trial", TRIAL_SUBSCRIPTION.maxScreens, 0);
}

export { GRACE_DAYS };

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
import { SUBSCRIPTION } from "@/config/subscription";
import { fetchKioskState } from "@/services/venue/venue-supabase.service";
import { normalizeMenuCatalogType } from "@/lib/menu-display-type";

function emptyAccess(status: SubscriptionStatus = "expired"): SubscriptionAccess {
  return {
    allowed: false,
    kiosk_allowed: false,
    dashboard_allowed: false,
    dashboard_edit_allowed: false,
    can_add_devices: false,
    status,
    reason: `subscription_${status}`,
    screen_count: 0,
    device_limit: 0,
    active_device_count: 0,
    banner: status === "expired" ? "expired" : "error",
  };
}

/** مرآة لـ resolve_subscription_access — للتطوير المحلي فقط */
export function resolveAccessFromStatus(
  status: SubscriptionStatus,
  deviceLimit: number,
  activeDevices: number,
): SubscriptionAccess {
  const effectiveScreens =
    status === "trial" ? SUBSCRIPTION.trialMaxScreens : Math.max(0, deviceLimit);

  const allowed = status === "trial" || status === "active";

  return {
    allowed,
    kiosk_allowed: allowed,
    dashboard_allowed: allowed,
    dashboard_edit_allowed: allowed,
    can_add_devices: allowed && activeDevices < effectiveScreens,
    status,
    reason: allowed ? null : `subscription_${status}`,
    screen_count: effectiveScreens,
    device_limit: deviceLimit,
    active_device_count: activeDevices,
    banner:
      status === "trial"
        ? "trial"
        : status === "suspended"
          ? "suspended"
          : status === "expired"
            ? "expired"
            : status === "canceled"
              ? "canceled"
              : null,
  };
}

export function subscriptionInfoFromAccess(access: SubscriptionAccess): SubscriptionInfo {
  const plan =
    access.status === "trial"
      ? "تجربة مجانية"
      : access.status === "active"
        ? "اشتراك نشط"
        : "غير نشط";

  const renewsOn = access.subscription_ends_at
    ? new Date(access.subscription_ends_at).toLocaleDateString("ar-SA")
    : access.trial_ends_at
      ? new Date(access.trial_ends_at).toLocaleDateString("ar-SA")
      : "—";

  let daysLeft = 0;
  const end = access.trial_ends_at ?? access.subscription_ends_at;
  if (end) {
    daysLeft = Math.max(0, Math.ceil((Date.parse(end) - Date.now()) / 86400000));
  }

  return {
    plan,
    status: access.status,
    screens: access.active_device_count,
    maxScreens: access.screen_count,
    pricePerScreen: 0,
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
    dashboard_allowed: Boolean(o.dashboard_allowed ?? o.allowed),
    dashboard_edit_allowed: Boolean(o.dashboard_edit_allowed),
    can_add_devices: Boolean(o.can_add_devices),
    status,
    reason: typeof o.reason === "string" ? o.reason : null,
    screen_count: Number(o.screen_count ?? 0),
    device_limit: Number(o.device_limit ?? o.screen_count ?? 0),
    active_device_count: Number(o.active_device_count ?? 0),
    trial_started_at: (o.trial_started_at as string) ?? null,
    trial_ends_at: (o.trial_ends_at as string) ?? null,
    subscription_started_at: (o.subscription_started_at as string) ?? null,
    subscription_ends_at: (o.subscription_ends_at as string) ?? null,
    manual_activation: Boolean(o.manual_activation),
    banner: (o.banner as SubscriptionAccess["banner"]) ?? null,
  };
}

export type SubscriptionFetchResult =
  | { ok: true; data: OwnerSubscription }
  | { ok: false; isNetwork: boolean; code?: string; message: string };

export async function fetchOwnerSubscription(): Promise<SubscriptionFetchResult> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    return { ok: false, isNetwork: false, message: "supabase_not_configured" };
  }

  try {
    const { data, error } = await getSupabase().rpc("get_owner_subscription");
    if (error) {
      const message = error.message ?? "subscription_fetch_failed";
      const isNetwork = /failed to fetch|networkerror|load failed/i.test(message);
      const isReadOnlyTxn = /25006|read-only transaction/i.test(message);
      logger.error("subscription.fetch_failed", { message, code: error.code });
      return {
        ok: false,
        isNetwork,
        code: isReadOnlyTxn ? "25006" : error.code,
        message,
      };
    }

    if (!data || typeof data !== "object") {
      return { ok: false, isNetwork: false, message: "invalid_subscription_response" };
    }

    const row = data as Record<string, unknown>;
    const access = parseAccess(row.access) ?? emptyAccess("expired");

    return {
      ok: true,
      data: {
        owner_id: String(row.owner_id ?? ""),
        status: (row.status as SubscriptionStatus) ?? access.status,
        screen_count: Number(row.screen_count ?? access.screen_count),
        device_limit: Number(row.device_limit ?? row.screen_count ?? access.screen_count),
        trial_started_at: (row.trial_started_at as string) ?? null,
        trial_ends_at: (row.trial_ends_at as string) ?? null,
        subscription_started_at: (row.subscription_started_at as string) ?? null,
        subscription_ends_at: (row.subscription_ends_at as string) ?? null,
        manual_activation: Boolean(row.manual_activation),
        activated_at: (row.activated_at as string) ?? null,
        notes: typeof row.notes === "string" ? row.notes : null,
        access,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isNetwork = /failed to fetch|networkerror|load failed/i.test(message);
    logger.error("subscription.fetch_exception", { message });
    return { ok: false, isNetwork, message };
  }
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
      const [{ data, error }, kioskState] = await Promise.all([
        getSupabase().rpc("check_kiosk_access", {
          p_device_code: normalized,
        }),
        fetchKioskState(normalized, force),
      ]);

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
        menu_type:
          normalizeMenuCatalogType(
            typeof row.menu_type === "string" ? row.menu_type : kioskState.menu_type,
          ) ?? kioskState.menu_type,
        venue_updated_at:
          typeof row.venue_updated_at === "string"
            ? row.venue_updated_at
            : kioskState.venue_updated_at,
        subscription_status:
          typeof row.subscription_status === "string"
            ? (row.subscription_status as SubscriptionStatus)
            : (kioskState.subscription_status as SubscriptionStatus | null | undefined),
        retry_after_seconds:
          typeof row.retry_after_seconds === "number" ? row.retry_after_seconds : undefined,
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
  const check = await checkKioskAccess(deviceCode.trim().toUpperCase());
  return check.allowed;
}

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

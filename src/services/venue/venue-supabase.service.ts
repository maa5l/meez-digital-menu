import { appEnv } from "@/config/env";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { cachedFetch, invalidateCacheKey, invalidateCachePrefix } from "@/lib/request-cache";
import { dispatchKioskGateRefresh } from "@/lib/menu-kiosk";
import type { VenueData } from "@/types/venue";
import { logger } from "@/lib/logger";
import {
  hasExceededRetryAttempts,
  parseRetryAfterSeconds,
  recordRateLimitHit,
  recordRateLimitSuccess,
  shouldSkipRateLimitedRequest,
} from "@/lib/rate-limit-coordinator";

export type KioskState = {
  allowed: boolean;
  registered: boolean;
  reason?: string;
  menu_type?: string | null;
  venue_updated_at?: string | null;
  subscription_status?: string | null;
  retry_after_seconds?: number;
  rateLimited?: boolean;
};

const RPC_TTL_MS = 18_000;
const lastKnownKioskState = new Map<string, KioskState>();

export function shouldUseVenueDatabase(): boolean {
  return isSupabaseConfigured() && !appEnv.useLocalMockAuth;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function invalidateOwnerVenueCache(ownerId: string): void {
  invalidateCachePrefix(`venue:owner:${ownerId}:`);
  invalidateCacheKey(`venue:preview:${ownerId}`);
}

export function invalidateDeviceVenueCache(code: string): void {
  const norm = normalizeCode(code);
  // لا تمسح kiosk:state/access — مسحها أثناء مزامنة المنيو يسبب فصلًا خاطئًا
  invalidateCachePrefix(`venue:device:${norm}:`);
}

export async function fetchVenueUpdatedAtForOwner(
  ownerId: string,
  force = false,
): Promise<string | null> {
  if (!shouldUseVenueDatabase()) return null;

  return cachedFetch(
    `venue:owner:${ownerId}:updated_at`,
    async () => {
      const { data, error } = await getSupabase().rpc("get_owner_venue_updated_at");

      if (error) {
        logger.error("venue.updated_at_failed", { ownerId, message: error.message });
        throw error;
      }

      return typeof data === "string" ? data : null;
    },
    RPC_TTL_MS,
    force,
  );
}

export async function fetchVenueFromDatabase(
  ownerId: string,
  force = false,
): Promise<VenueData | null> {
  if (!shouldUseVenueDatabase()) return null;

  return cachedFetch(
    `venue:owner:${ownerId}:full`,
    async () => {
      const { data, error } = await getSupabase().rpc("get_owner_venue");

      if (error) {
        logger.error("venue.fetch_failed", { ownerId, message: error.message });
        throw error;
      }

      if (!data || typeof data !== "object") return null;
      const row = data as { data?: unknown; updated_at?: string };
      if (!row.data || typeof row.data !== "object") return null;
      return row.data as VenueData;
    },
    RPC_TTL_MS,
    force,
  );
}

function kioskStateScopeKey(norm: string): string {
  return `kiosk:state:${norm}`;
}

function fallbackKioskState(norm: string): KioskState {
  const cached = lastKnownKioskState.get(norm);
  if (cached) {
    return {
      ...cached,
      rateLimited: true,
      reason: "rate_limited",
    };
  }
  return {
    allowed: false,
    registered: false,
    reason: "rate_limited",
    rateLimited: true,
  };
}

function rememberKioskState(norm: string, state: KioskState): void {
  if (state.reason !== "rate_limited" && !state.rateLimited) {
    lastKnownKioskState.set(norm, state);
  }
}

/** بوابة الكشك — RPC get_kiosk_state (JSONB مُصفّى، rate-limited per scope) */
export async function fetchKioskState(
  code: string,
  force = false,
): Promise<KioskState> {
  if (!shouldUseVenueDatabase()) {
    return { allowed: true, registered: true };
  }

  const norm = normalizeCode(code);
  const scopeKey = kioskStateScopeKey(norm);

  if (!force && shouldSkipRateLimitedRequest(scopeKey)) {
    return fallbackKioskState(norm);
  }

  if (hasExceededRetryAttempts(scopeKey)) {
    logger.warn("kiosk.state_max_retries", { code: norm });
    return fallbackKioskState(norm);
  }

  return cachedFetch(
    scopeKey,
    async () => {
      const { data, error } = await getSupabase().rpc("get_kiosk_state", {
        p_code: norm,
      });

      if (error) {
        logger.error("kiosk.state_failed", {
          endpoint: "get_kiosk_state",
          method: "RPC",
          code: norm,
          message: error.message,
        });
        return { allowed: false, registered: false, reason: "check_failed" };
      }

      if (!data || typeof data !== "object") {
        const state = { allowed: false, registered: false, reason: "invalid_response" };
        rememberKioskState(norm, state);
        recordRateLimitSuccess(scopeKey);
        return state;
      }

      const row = data as Record<string, unknown>;
      if (row.reason === "rate_limited") {
        const retrySec = parseRetryAfterSeconds(row.retry_after_seconds, 60);
        recordRateLimitHit(
          { key: scopeKey, endpoint: "get_kiosk_state", method: "RPC" },
          retrySec,
          { deviceCode: norm },
        );
        return fallbackKioskState(norm);
      }

      recordRateLimitSuccess(scopeKey);

      const state: KioskState = {
        allowed: Boolean(row.allowed),
        registered: Boolean(row.registered),
        reason: typeof row.reason === "string" ? row.reason : undefined,
        menu_type: typeof row.menu_type === "string" ? row.menu_type : null,
        venue_updated_at:
          typeof row.venue_updated_at === "string" ? row.venue_updated_at : null,
        subscription_status:
          typeof row.subscription_status === "string" ? row.subscription_status : null,
        retry_after_seconds:
          typeof row.retry_after_seconds === "number"
            ? row.retry_after_seconds
            : undefined,
      };
      rememberKioskState(norm, state);
      return state;
    },
    RPC_TTL_MS,
    force,
  );
}

/** طلب خفيف — updated_at من get_kiosk_state (لا RPC منفصل) */
export async function fetchVenueUpdatedAtForDevice(
  code: string,
  force = false,
): Promise<string | null> {
  const state = await fetchKioskState(code, force);
  // أعد فحص البوابة فقط عند فصل صريح — لا عند اشتراك/أخطاء عابرة
  if (
    shouldUseVenueDatabase() &&
    !state.rateLimited &&
    state.reason !== "rate_limited" &&
    (state.reason === "device_inactive" || state.reason === "device_not_registered")
  ) {
    dispatchKioskGateRefresh({ code, reason: state.reason });
  }
  return state.venue_updated_at ?? null;
}

/** حفظ المنيو — RPC فقط (update_venue_data) مع فحص الاشتراك */
export async function saveVenueToDatabase(ownerId: string, venue: VenueData): Promise<void> {
  if (!shouldUseVenueDatabase()) return;

  const session = await getSupabase().auth.getSession();
  if (session.data.session?.user?.id !== ownerId) {
    throw new Error("owner_mismatch");
  }

  const { updateVenueDataRpc } = await import("@/services/core/platform-security");
  const { markVenueRemoteSynced } = await import("@/lib/venue-store");
  const result = await updateVenueDataRpc(venue);

  if (!result.ok) {
    const msg = result.error ?? "venue_update_denied";
    logger.error("venue.save_failed", { ownerId, message: msg });
    throw new Error(msg);
  }

  markVenueRemoteSynced(ownerId, result.updatedAt ?? null);
  invalidateOwnerVenueCache(ownerId);
  logger.audit("venue.saved_cloud", { ownerId });
}

export async function fetchVenueForDeviceFromDatabase(
  code: string,
  force = false,
): Promise<VenueData | null> {
  if (!shouldUseVenueDatabase()) return null;

  const norm = normalizeCode(code);

  return cachedFetch(
    `venue:device:${norm}:full`,
    async () => {
      const { data, error } = await getSupabase().rpc("get_kiosk_venue", {
        p_code: norm,
      });

      if (error) {
        logger.error("venue.device_fetch_failed", { code: norm, message: error.message });
        throw error;
      }

      if (!data || typeof data !== "object") return null;
      return data as VenueData;
    },
    RPC_TTL_MS,
    force,
  );
}

export async function isDeviceActivatedInDatabase(code: string): Promise<boolean> {
  if (!shouldUseVenueDatabase()) return false;

  const { data, error } = await getSupabase().rpc("is_device_activated", {
    device_code: normalizeCode(code),
  });

  if (error) {
    logger.error("device.activation_check_failed", { code, message: error.message });
    return false;
  }

  return Boolean(data);
}

export async function getDeviceMenuTypeFromDatabase(
  code: string,
): Promise<"products" | "crops" | null> {
  if (!shouldUseVenueDatabase()) return null;

  const { data, error } = await getSupabase().rpc("get_device_menu_type", {
    device_code: normalizeCode(code),
  });

  if (error) {
    logger.error("device.menu_type_failed", { code, message: error.message });
    return null;
  }

  if (data === "products" || data === "crops") return data;
  return null;
}

/** @deprecated استخدم registerDeviceWithLicense — الكتابة المباشرة ممنوعة */
export async function upsertDeviceActivationInDatabase(
  _code: string,
  _ownerId: string,
  _menuType?: "products" | "crops",
): Promise<void> {
  if (!shouldUseVenueDatabase()) return;
  logger.warn("device.direct_write_blocked", { hint: "use register_device_with_license RPC" });
}

/** إلغاء تفعيل الجهاز عبر RPC (لا حذف — الكود لا يُعاد استخدامه) */
export async function removeDeviceActivationFromDatabase(code: string): Promise<void> {
  if (!shouldUseVenueDatabase()) return;

  const { deactivateDeviceRpc } = await import("@/services/core/platform-security");
  const result = await deactivateDeviceRpc(code);
  if (!result.ok) {
    logger.error("device.activation_deactivate_failed", { code, message: result.error });
    throw new Error(result.error ?? "deactivate_failed");
  }
}

type CloudDeviceRow = {
  device_id?: string;
  code: string;
  menu_type?: string | null;
  status?: string;
  device_name?: string | null;
  last_seen_at?: string | null;
  activated_at?: string | null;
};

function formatDeviceLastActive(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const diffMin = Math.floor((Date.now() - ts) / 60_000);
  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} د`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 48) return `منذ ${diffH} س`;
  return new Date(iso).toLocaleDateString("ar-SA");
}

function cloudRowToDevice(row: CloudDeviceRow): import("@/types/domain").Device {
  const menuType =
    row.menu_type === "crops" ? "crops" : row.menu_type === "products" ? "products" : undefined;
  const baseName = (row.device_name?.trim() || row.code).trim();
  const name =
    menuType != null
      ? `${baseName} · ${menuType === "crops" ? "محاصيل" : "منتجات"}`
      : baseName;

  return {
    id: String(row.device_id ?? row.code),
    name,
    code: row.code.trim().toUpperCase(),
    menuType,
    status: row.status === "active" ? "active" : "inactive",
    lastActive: formatDeviceLastActive(row.last_seen_at ?? row.activated_at),
  };
}

/** جلب أجهزة المالك من Supabase — مصدر الحقيقة للعداد والترخيص */
export async function fetchOwnerDevicesFromDatabase(): Promise<
  import("@/types/domain").Device[]
> {
  if (!shouldUseVenueDatabase()) return [];

  const { data, error } = await getSupabase().rpc("list_owner_devices");
  if (error) {
    logger.error("device.list_owner_failed", { message: error.message });
    throw error;
  }

  if (!Array.isArray(data)) return [];
  return (data as CloudDeviceRow[])
    .filter((row) => typeof row.code === "string" && row.code.trim())
    .map(cloudRowToDevice);
}

/**
 * مزامنة قائمة الأجهزة مع Supabase — الأجهزة النشطة فقط
 */
export async function syncOwnerDevicesFromCloud(
  updateVenue: (patch: (prev: VenueData) => VenueData) => void,
): Promise<void> {
  if (!shouldUseVenueDatabase()) return;

  const cloudDevices = await fetchOwnerDevicesFromDatabase();

  updateVenue((v) => {
    const localByCode = new Map(v.devices.map((d) => [d.code, d]));
    const merged = cloudDevices.map((cloud) => {
      const local = localByCode.get(cloud.code);
      return local
        ? {
            ...local,
            status: cloud.status,
            menuType: cloud.menuType ?? local.menuType,
            lastActive: cloud.lastActive,
            name: local.name.trim() ? local.name : cloud.name,
          }
        : cloud;
    });

    const same =
      merged.length === v.devices.length &&
      merged.every(
        (d, i) =>
          v.devices[i]?.code === d.code &&
          v.devices[i]?.status === d.status &&
          v.devices[i]?.name === d.name,
      );
    if (same) return v;

    return {
      ...v,
      devices: merged,
      subscription: {
        ...v.subscription,
        screens: merged.filter((d) => d.status === "active").length,
      },
    };
  });
}

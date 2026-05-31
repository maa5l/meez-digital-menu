import { appEnv } from "@/config/env";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { VenueData } from "@/types/venue";
import { logger } from "@/lib/logger";

export function shouldUseVenueDatabase(): boolean {
  return isSupabaseConfigured() && !appEnv.useLocalMockAuth;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function fetchVenueUpdatedAtForOwner(ownerId: string): Promise<string | null> {
  if (!shouldUseVenueDatabase()) return null;

  const { data, error } = await getSupabase()
    .from("venues")
    .select("updated_at")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    logger.error("venue.updated_at_failed", { ownerId, message: error.message });
    throw error;
  }

  return data?.updated_at ?? null;
}

export async function fetchVenueFromDatabase(ownerId: string): Promise<VenueData | null> {
  if (!shouldUseVenueDatabase()) return null;

  const { data, error } = await getSupabase()
    .from("venues")
    .select("data, updated_at")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    logger.error("venue.fetch_failed", { ownerId, message: error.message });
    throw error;
  }

  if (!data?.data || typeof data.data !== "object") return null;
  return data.data as VenueData;
}

/** طلب خفيف — يعيد وقت آخر تحديث فقط (للكيوسك) */
export async function fetchVenueUpdatedAtForDevice(code: string): Promise<string | null> {
  if (!shouldUseVenueDatabase()) return null;

  const { data, error } = await getSupabase().rpc("get_venue_updated_at_for_device", {
    device_code: normalizeCode(code),
  });

  if (error) {
    logger.error("venue.device_updated_at_failed", { code, message: error.message });
    throw error;
  }

  return typeof data === "string" ? data : null;
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
  logger.audit("venue.saved_cloud", { ownerId });
}

export async function fetchVenueForDeviceFromDatabase(code: string): Promise<VenueData | null> {
  if (!shouldUseVenueDatabase()) return null;

  const { data, error } = await getSupabase().rpc("get_venue_for_device", {
    device_code: normalizeCode(code),
  });

  if (error) {
    logger.error("venue.device_fetch_failed", { code, message: error.message });
    throw error;
  }

  if (!data || typeof data !== "object") return null;
  return data as VenueData;
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

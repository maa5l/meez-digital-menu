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

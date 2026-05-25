import { isSupabaseConfigured } from "@/config/env";
import { getSupabase } from "@/services/supabase";
import { logger } from "@/lib/logger";

export type RegistrationStatus = "checking" | "not_registered" | "registered";

/** فحص خفيف — لا يحدّث heartbeat (مناسب للـ polling) */
export async function checkDeviceRegisteredOnServer(code: string): Promise<RegistrationStatus> {
  if (!isSupabaseConfigured()) {
    return "not_registered";
  }

  const normalized = code.trim().toUpperCase();

  try {
    const { data, error } = await getSupabase().rpc("is_device_activated", {
      device_code: normalized,
    });

    if (error) {
      logger.error("kiosk.peek_failed", { message: error.message });
      return "not_registered";
    }

    return data === true ? "registered" : "not_registered";
  } catch (err) {
    logger.error("kiosk.peek_exception", {
      message: err instanceof Error ? err.message : String(err),
    });
    return "not_registered";
  }
}

/** فحص كامل قبل فتح المنيو (اشتراك + heartbeat) */
export async function verifyKioskAccessBeforeMenu(code: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { data, error } = await getSupabase().rpc("check_kiosk_access", {
      p_device_code: code.trim().toUpperCase(),
    });

    if (error) {
      logger.error("kiosk.access_failed", { message: error.message });
      return false;
    }

    if (!data || typeof data !== "object") return false;
    const row = data as Record<string, unknown>;
    return Boolean(row.allowed) && Boolean(row.registered);
  } catch {
    return false;
  }
}

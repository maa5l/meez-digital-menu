import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

/** يعلن المتصفح/الآيباد أن الرمز ظاهر — مطلوب قبل التفعيل من لوحة التحكم */
export async function announceKioskPairingCode(code: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const normalized = code.trim().toUpperCase();

  try {
    const { data, error } = await getSupabase().rpc("announce_kiosk_pairing_code", {
      p_code: normalized,
    });

    if (error) {
      logger.error("kiosk.announce_failed", { message: error.message, code: normalized });
      return false;
    }

    const row = data as Record<string, unknown> | null;
    return Boolean(row?.ok);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("kiosk.announce_exception", { message, code: normalized });
    return false;
  }
}

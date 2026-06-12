import { isSupabaseConfigured } from "@/config/env";
import { getSupabase } from "@/services/supabase";
import { cachedFetch } from "@/lib/request-cache";
import { logger } from "@/lib/logger";

export type RegistrationStatus = "checking" | "not_registered" | "registered";

const RPC_TTL_MS = 30_000;

/** فحص خفيف — مع cache 30s */
export async function checkDeviceRegisteredOnServer(
  code: string,
  force = false,
): Promise<RegistrationStatus> {
  if (!isSupabaseConfigured()) {
    return "not_registered";
  }

  const normalized = code.trim().toUpperCase();

  return cachedFetch(
    `kiosk:peek:${normalized}`,
    async () => {
      try {
        const { data, error } = await getSupabase().rpc("get_kiosk_state", {
          p_code: normalized,
        });

        if (error) {
          logger.error("kiosk.peek_failed", { message: error.message, code: normalized });
          return "not_registered" as RegistrationStatus;
        }

        if (!data || typeof data !== "object") return "not_registered" as RegistrationStatus;
        const row = data as Record<string, unknown>;
        if (row.reason === "rate_limited") return "not_registered" as RegistrationStatus;
        const registered = Boolean(row.registered);
        const allowed = Boolean(row.allowed);
        return registered && allowed ? "registered" : "not_registered";
      } catch (err) {
        logger.error("kiosk.peek_exception", {
          message: err instanceof Error ? err.message : String(err),
          code: normalized,
        });
        return "not_registered" as RegistrationStatus;
      }
    },
    RPC_TTL_MS,
    force,
  );
}

/** فحص كامل قبل فتح المنيو */
export async function verifyKioskAccessBeforeMenu(code: string): Promise<boolean> {
  const status = await checkDeviceRegisteredOnServer(code);
  return status === "registered";
}

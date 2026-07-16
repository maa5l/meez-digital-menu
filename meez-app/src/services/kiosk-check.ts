import { isSupabaseConfigured } from "@/config/env";
import { getSupabase } from "@/services/supabase";
import { cachedFetch } from "@/lib/request-cache";
import { logger } from "@/lib/logger";

export type RegistrationStatus = "checking" | "not_registered" | "registered" | "error";

export type RegistrationPeek = {
  status: RegistrationStatus;
  reason?: string | null;
  message?: string;
  retry_after_seconds?: number;
};

const RPC_TTL_MS = 12_000;

/** فحص خفيف — cache قصير حتى يظهر التفعيل بسرعة بعد لوحة التحكم */
export async function peekDeviceRegistration(
  code: string,
  force = false,
): Promise<RegistrationPeek> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Supabase غير مضبوط" };
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
          return {
            status: "error" as RegistrationStatus,
            message: error.message,
          };
        }

        if (!data || typeof data !== "object") {
          return { status: "not_registered" as RegistrationStatus };
        }
        const row = data as Record<string, unknown>;
        if (row.reason === "rate_limited") {
          return {
            status: "error" as RegistrationStatus,
            reason: "rate_limited",
            message: "محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة",
            retry_after_seconds:
              typeof row.retry_after_seconds === "number"
                ? row.retry_after_seconds
                : 60,
          };
        }
        const registered = Boolean(row.registered);
        const allowed = Boolean(row.allowed);
        if (registered && allowed) {
          return { status: "registered" as RegistrationStatus };
        }
        return {
          status: "not_registered" as RegistrationStatus,
          reason: typeof row.reason === "string" ? row.reason : null,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("kiosk.peek_exception", { message, code: normalized });
        return { status: "error" as RegistrationStatus, message };
      }
    },
    RPC_TTL_MS,
    force,
  );
}

export async function checkDeviceRegisteredOnServer(
  code: string,
  force = false,
): Promise<RegistrationStatus> {
  const peek = await peekDeviceRegistration(code, force);
  return peek.status === "registered" ? "registered" : "not_registered";
}

/** فحص كامل قبل فتح المنيو */
export async function verifyKioskAccessBeforeMenu(code: string): Promise<boolean> {
  const status = await checkDeviceRegisteredOnServer(code);
  return status === "registered";
}

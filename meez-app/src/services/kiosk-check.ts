import { isSupabaseConfigured } from "@/config/env";
import { getSupabase } from "@/services/supabase";
import { cachedFetch } from "@/lib/request-cache";
import { logger } from "@/lib/logger";
import {
  hasExceededRetryAttempts,
  parseRetryAfterSeconds,
  recordRateLimitHit,
  recordRateLimitSuccess,
  shouldSkipRateLimitedRequest,
} from "@/lib/rate-limit-coordinator";

export type RegistrationStatus = "checking" | "not_registered" | "registered" | "error";

export type RegistrationPeek = {
  status: RegistrationStatus;
  reason?: string | null;
  message?: string;
  retry_after_seconds?: number;
  /** true = rate limit — لا يوقف المنيو أو بقية العمليات */
  rateLimited?: boolean;
};

const RPC_TTL_MS = 25_000;
const lastKnownGood = new Map<string, RegistrationPeek>();

function scopeKey(code: string): string {
  return `kiosk:peek:${code.trim().toUpperCase()}`;
}

function rememberGood(code: string, peek: RegistrationPeek): void {
  if (peek.status === "registered" || peek.status === "not_registered") {
    lastKnownGood.set(scopeKey(code), peek);
  }
}

function fallbackWhileRateLimited(code: string): RegistrationPeek {
  const cached = lastKnownGood.get(scopeKey(code));
  if (cached) {
    return {
      ...cached,
      rateLimited: true,
      reason: "rate_limited",
      message: "تعذّر تحديث حالة الجهاز الآن، سنحاول مرة أخرى تلقائيًا.",
    };
  }
  return {
    status: "checking",
    rateLimited: true,
    reason: "rate_limited",
    message: "جاري التحقق من حالة الجهاز…",
  };
}

/** فحص خlight — cache + rate-limit per endpoint (لا إيقاف عالمي) */
export async function peekDeviceRegistration(
  code: string,
  force = false,
): Promise<RegistrationPeek> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Supabase غير مضبوط" };
  }

  const normalized = code.trim().toUpperCase();
  const key = scopeKey(normalized);

  if (!force && shouldSkipRateLimitedRequest(key)) {
    return fallbackWhileRateLimited(normalized);
  }

  if (hasExceededRetryAttempts(key)) {
    logger.warn("kiosk.peek_max_retries", { code: normalized });
    return {
      status: "error",
      reason: "rate_limited",
      message: "تعذّر تحديث حالة الجهاز بعد عدة محاولات. سيُعاد المحاولة لاحقًا.",
      retry_after_seconds: 120,
      rateLimited: true,
    };
  }

  return cachedFetch(
    key,
    async () => {
      try {
        const { data, error } = await getSupabase().rpc("get_kiosk_state", {
          p_code: normalized,
        });

        if (error) {
          logger.error("kiosk.peek_failed", {
            endpoint: "get_kiosk_state",
            method: "RPC",
            code: normalized,
            message: error.message,
          });
          return {
            status: "error" as RegistrationStatus,
            message: error.message,
          };
        }

        if (!data || typeof data !== "object") {
          const peek = { status: "not_registered" as RegistrationStatus };
          rememberGood(normalized, peek);
          recordRateLimitSuccess(key);
          return peek;
        }

        const row = data as Record<string, unknown>;
        if (row.reason === "rate_limited") {
          const retrySec = parseRetryAfterSeconds(row.retry_after_seconds, 60);
          recordRateLimitHit(
            { key, endpoint: "get_kiosk_state", method: "RPC" },
            retrySec,
            { deviceCode: normalized },
          );
          return fallbackWhileRateLimited(normalized);
        }

        recordRateLimitSuccess(key);

        const registered = Boolean(row.registered);
        const allowed = Boolean(row.allowed);
        if (registered && allowed) {
          const peek = { status: "registered" as RegistrationStatus };
          rememberGood(normalized, peek);
          return peek;
        }

        const peek = {
          status: "not_registered" as RegistrationStatus,
          reason: typeof row.reason === "string" ? row.reason : null,
        };
        rememberGood(normalized, peek);
        return peek;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("kiosk.peek_exception", {
          endpoint: "get_kiosk_state",
          method: "RPC",
          message,
          code: normalized,
        });
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

export async function verifyKioskAccessBeforeMenu(code: string): Promise<boolean> {
  const peek = await peekDeviceRegistration(code, true);
  return peek.status === "registered";
}

/** للاختبارات */
export function __resetKioskPeekCache(): void {
  lastKnownGood.clear();
}

import type { KioskAccessCheck } from "@/types/subscription";
import { appEnv } from "@/config/env";
import { isValidDeviceCode } from "@/services/device/activation";
import { checkKioskAccess } from "@/services/subscription/subscription-enforcement";
import { shouldUseVenueDatabase } from "@/services/venue/venue-supabase.service";
import { isDeviceActivated } from "@/services/device/activation";

export type KioskGateResult = KioskAccessCheck & {
  registrationStatus: "checking" | "not_registered" | "registered";
};

/**
 * بوابة الكشك — القرار من RPC check_kiosk_access عند تفعيل Supabase.
 */
export async function evaluateKioskGate(deviceCode: string): Promise<KioskGateResult> {
  const normalized = deviceCode.trim().toUpperCase();
  if (!isValidDeviceCode(normalized)) {
    return {
      allowed: false,
      registered: false,
      reason: "invalid_code",
      registrationStatus: "not_registered",
    };
  }

  if (shouldUseVenueDatabase()) {
    const check = await checkKioskAccess(normalized);
    return {
      ...check,
      registrationStatus: check.registered && check.allowed ? "registered" : check.registered ? "registered" : "not_registered",
    };
  }

  const localActive = isDeviceActivated(normalized);
  return {
    allowed: localActive,
    registered: localActive,
    registrationStatus: localActive ? "registered" : "not_registered",
    reason: localActive ? undefined : "device_not_registered",
  };
}

/** فترة إعادة التحقق من الاشتراك على الكشك (ms) — صامتة في الخلفية */
export const KIOSK_SUBSCRIPTION_POLL_MS = appEnv.isProd ? 120_000 : 60_000;

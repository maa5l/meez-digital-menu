import { appEnv } from "@/config/env";
import { ROUTES } from "@/config/app";
import { isValidDeviceCode } from "@/services/device/activation";
import { isPairingSessionId } from "@/services/device/pairing-session.service";

/** رابط فتح شاشة الربط على الآيباد (جلسة فقط — الرمز يُولَّد على الجهاز) */
export function getDevicePairingUrl(sessionId: string, baseUrl = appEnv.appUrl): string {
  const origin = baseUrl.replace(/\/$/, "");
  return `${origin}${ROUTES.pair}?sid=${encodeURIComponent(sessionId)}`;
}

/** رابط المنيو بعد التفعيل */
export function getDeviceMenuUrl(code: string, baseUrl = appEnv.appUrl): string {
  const origin = baseUrl.replace(/\/$/, "");
  return `${origin}${ROUTES.menu}?code=${encodeURIComponent(code.trim().toUpperCase())}`;
}

export function normalizeDeviceCodeParam(value: string | null): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  return isValidDeviceCode(code) ? code : null;
}

export function normalizePairingSessionParam(value: string | null): string | null {
  if (!value || !isPairingSessionId(value)) return null;
  return value;
}

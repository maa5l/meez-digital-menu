import { getLocalJson, setLocalJson } from "@/security/storage";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { appEnv } from "@/config/env";
import { generateDeviceCode, isValidDeviceCode } from "@/services/device/activation";
import { logger } from "@/lib/logger";

const PAIRING_SESSION_PREFIX = "meez:pairing-session:";
const SESSION_TTL_MS = 30 * 60 * 1000;

type LocalPairingSession = {
  code: string | null;
  ownerId?: string;
  expiresAt: number;
};

function pairingKey(sessionId: string): string {
  return `${PAIRING_SESSION_PREFIX}${sessionId}`;
}

function isCloudPairingEnabled(): boolean {
  return isSupabaseConfigured() && !appEnv.useLocalMockAuth;
}

/** إنشاء جلسة ربط من لوحة التحكم */
export async function createPairingSession(ownerId: string): Promise<string> {
  if (isCloudPairingEnabled()) {
    const { data, error } = await getSupabase().rpc("create_device_pairing_session");
    if (error) {
      logger.error("pairing.session_create_failed", { message: error.message });
      throw new Error("تعذّر إنشاء جلسة الربط");
    }
    if (!data) throw new Error("تعذّر إنشاء جلسة الربط");
    return String(data);
  }

  const sessionId = crypto.randomUUID();
  setLocalJson(pairingKey(sessionId), {
    code: null,
    ownerId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  } satisfies LocalPairingSession);
  return sessionId;
}

/** الآيباد يسجّل الرمز بعد فتح الرابط */
export async function claimPairingSession(sessionId: string, code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (!isValidDeviceCode(normalized)) return false;

  if (isCloudPairingEnabled()) {
    const { data, error } = await getSupabase().rpc("claim_device_pairing_session", {
      p_session_id: sessionId,
      p_code: normalized,
    });
    if (error) {
      logger.error("pairing.session_claim_failed", { sessionId, message: error.message });
      return false;
    }
    return Boolean(data);
  }

  const key = pairingKey(sessionId);
  const session = getLocalJson<LocalPairingSession | null>(key, null);
  if (!session || session.expiresAt < Date.now() || session.code) return false;

  setLocalJson(key, { ...session, code: normalized });
  return true;
}

/** لوحة التحكم تنتظر ظهور الرمز من الآيباد */
export async function fetchPairingSessionCode(
  sessionId: string,
  ownerId: string,
): Promise<string | null> {
  if (isCloudPairingEnabled()) {
    const { data, error } = await getSupabase().rpc("get_device_pairing_session_code", {
      p_session_id: sessionId,
    });
    if (error) {
      logger.error("pairing.session_fetch_failed", { sessionId, message: error.message });
      return null;
    }
    return typeof data === "string" && isValidDeviceCode(data) ? data : null;
  }

  const session = getLocalJson<LocalPairingSession | null>(pairingKey(sessionId), null);
  if (!session || session.expiresAt < Date.now()) return null;
  if (session.ownerId && session.ownerId !== ownerId) return null;
  return session.code && isValidDeviceCode(session.code) ? session.code : null;
}

/** يولّد رمزاً على الآيباد ويربطه بالجلسة */
export async function registerCodeOnPairingSession(sessionId: string): Promise<string> {
  const code = generateDeviceCode();
  const claimed = await claimPairingSession(sessionId, code);
  if (!claimed) {
    throw new Error("جلسة الربط غير صالحة أو منتهية");
  }
  return code;
}

export function isPairingSessionId(value: string | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

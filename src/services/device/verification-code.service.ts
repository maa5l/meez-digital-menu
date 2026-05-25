import { getLocalJson, setLocalJson } from "@/security/storage";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { appEnv } from "@/config/env";
import { generateDeviceCode, isValidDeviceCode } from "@/services/device/activation";
import { savePendingVerification } from "@/lib/pending-verification";
import { logger } from "@/lib/logger";

const VERIFICATION_PREFIX = "meez:verification:";
const TTL_MS = 30 * 60 * 1000;

type LocalVerification = {
  code: string;
  ownerId: string;
  sessionId: string;
  expiresAt: number;
};

function storageKey(ownerId: string): string {
  return `${VERIFICATION_PREFIX}${ownerId}`;
}

function useCloud(): boolean {
  return isSupabaseConfigured() && !appEnv.useLocalMockAuth;
}

function verificationErrorMessage(error: { message?: string; code?: string }): string {
  const msg = error.message ?? "";
  if (
    error.code === "PGRST202" ||
    msg.includes("create_device_verification_code") ||
    msg.includes("Could not find the function")
  ) {
    return "دوال كود التحقق غير موجودة. نفّذ supabase/FIX_VERIFICATION_CODE.sql في Supabase SQL Editor.";
  }
  if (msg.includes("profiles") && msg.includes("does not exist")) {
    return "جدول profiles غير موجود. نفّذ supabase/FIX_VERIFICATION_CODE.sql في SQL Editor (الملف الكامل).";
  }
  if (msg.includes("device_pairing_sessions") && msg.includes("does not exist")) {
    return "جدول device_pairing_sessions غير موجود. نفّذ supabase/FIX_VERIFICATION_CODE.sql في SQL Editor.";
  }
  if (error.code === "42501" || msg.toLowerCase().includes("row-level security")) {
    return "صلاحيات غير كافية. تأكد من تسجيل الدخول ثم نفّذ FIX_VERIFICATION_CODE.sql.";
  }
  if (appEnv.isDev) return msg || "خطأ غير معروف";
  return "تعذّر إنشاء كود التحقق. نفّذ supabase/FIX_VERIFICATION_CODE.sql في Supabase.";
}

async function createVerificationCodeInTable(
  ownerId: string,
  code: string,
): Promise<string> {
  const { data, error } = await getSupabase()
    .from("device_pairing_sessions")
    .insert({ owner_id: ownerId, code })
    .select("id")
    .single();

  if (error) throw new Error(verificationErrorMessage(error));
  if (!data?.id) throw new Error("تعذّر إنشاء كود التحقق");
  return String(data.id);
}

/** إنشاء كود تحقق جديد من لوحة التحكم — يُحفظ في قاعدة البيانات */
export async function createVerificationCode(ownerId: string): Promise<{
  sessionId: string;
  code: string;
}> {
  const code = generateDeviceCode();

  if (useCloud()) {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("create_device_verification_code", {
      p_code: code,
    });

    if (!error && data) {
      savePendingVerification(code, "products");
      return { sessionId: String(data), code };
    }

    const rpcMissing =
      error &&
      (error.code === "PGRST202" ||
        error.message?.includes("create_device_verification_code") ||
        error.message?.includes("Could not find the function"));

    if (rpcMissing) {
      logger.warn("verification.rpc_missing_using_insert", { message: error.message });
      try {
        const sessionId = await createVerificationCodeInTable(ownerId, code);
        savePendingVerification(code, "products");
        return { sessionId, code };
      } catch (insertErr) {
        throw insertErr instanceof Error ? insertErr : new Error(verificationErrorMessage(error));
      }
    }

    if (error) {
      logger.error("verification.create_failed", { message: error.message, code: error.code });
      throw new Error(verificationErrorMessage(error));
    }

    throw new Error("تعذّر إنشاء كود التحقق");
  }

  const sessionId = crypto.randomUUID();
  setLocalJson(storageKey(ownerId), {
    code,
    ownerId,
    sessionId,
    expiresAt: Date.now() + TTL_MS,
  } satisfies LocalVerification);
  savePendingVerification(code, "products");
  return { sessionId, code };
}

/** حفظ الكود المعروض في لوحة التحكم قبل التفعيل */
export function rememberVerificationCode(
  code: string,
  menuType: "products" | "crops",
): void {
  savePendingVerification(code, menuType);
}

/** تحقق كود الدخول — يطابق البريد وجلسة صالحة في Supabase */
export async function verifyLoginVerificationCode(
  code: string,
  email: string,
): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (!isValidDeviceCode(normalized)) return false;

  if (!useCloud()) {
    if (typeof window === "undefined") return false;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(VERIFICATION_PREFIX)) continue;
      const row = getLocalJson<LocalVerification | null>(key, null);
      if (
        row &&
        row.expiresAt > Date.now() &&
        row.code.toUpperCase() === normalized
      ) {
        return true;
      }
    }
    return false;
  }

  const { data, error } = await getSupabase().rpc("verify_login_verification_code", {
    p_code: normalized,
    p_email: email.trim().toLowerCase(),
  });

  if (error) {
    logger.error("verification.login_check_failed", { message: error.message });
    return false;
  }

  return Boolean(data);
}

/** تحقق أن الكود صادر من لوحة التحكم لنفس المالك المسجّل */
export async function verifyOwnerVerificationCode(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (!isValidDeviceCode(normalized)) return false;

  if (!useCloud()) {
    return validateVerificationCode(normalized);
  }

  const { data, error } = await getSupabase().rpc("verify_owner_verification_code", {
    p_code: normalized,
  });

  if (error) {
    logger.error("verification.owner_check_failed", { message: error.message });
    return false;
  }

  return Boolean(data);
}

export async function consumeVerificationCode(code: string): Promise<void> {
  const normalized = code.trim().toUpperCase();
  if (!useCloud()) return;

  const { error } = await getSupabase().rpc("consume_verification_code", {
    p_code: normalized,
  });

  if (error) {
    logger.warn("verification.consume_failed", { message: error.message });
  }
}

/** التحقق من الكود (عام) */
export async function validateVerificationCode(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (!isValidDeviceCode(normalized)) return false;

  if (useCloud()) {
    const { data, error } = await getSupabase().rpc("validate_device_verification_code", {
      p_code: normalized,
    });
    if (error) {
      logger.error("verification.validate_failed", { message: error.message, code: error.code });
      return false;
    }
    return Boolean(data);
  }

  if (typeof window === "undefined") return false;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(VERIFICATION_PREFIX)) continue;
    const row = getLocalJson<LocalVerification | null>(key, null);
    if (row && row.expiresAt > Date.now() && row.code.toUpperCase() === normalized) {
      return true;
    }
  }
  return false;
}

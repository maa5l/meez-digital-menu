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

function isCloudVerificationEnabled(): boolean {
  return isSupabaseConfigured() && !appEnv.useLocalMockAuth;
}

function isRpcMissingError(error: {
  message?: string;
  code?: string;
  status?: number;
}): boolean {
  const msg = error.message ?? "";
  return (
    error.code === "PGRST202" ||
    error.status === 404 ||
    msg.includes("create_device_verification_code") ||
    msg.includes("Could not find the function") ||
    /404|not find the function|schema cache/i.test(msg)
  );
}

function verificationErrorMessage(error: {
  message?: string;
  code?: string;
  status?: number;
}): string {
  const msg = error.message ?? "";
  if (isRpcMissingError(error)) {
    return "دوال كود التحقق غير موجودة. طبّق migrations في supabase/migrations/.";
  }
  if (msg.includes("profiles") && msg.includes("does not exist")) {
    return "جدول profiles غير موجود. طبّق migrations في supabase/migrations/.";
  }
  if (msg.includes("device_pairing_sessions") && msg.includes("does not exist")) {
    return "جدول device_pairing_sessions غير موجود. طبّق migrations في supabase/migrations/.";
  }
  if (error.code === "42501" || msg.toLowerCase().includes("row-level security")) {
    return "صلاحيات غير كافية. تأكد من تسجيل الدخول وتطبيق migrations.";
  }
  if (appEnv.isDev) return msg || "خطأ غير معروف";
  return "تعذّر إنشاء كود التحقق. تحقق من Supabase وتطبيق migrations.";
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

  if (isCloudVerificationEnabled()) {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("create_device_verification_code", {
      p_code: code,
    });

    if (!error && data) {
      savePendingVerification(code, "products");
      return { sessionId: String(data), code };
    }

    if (error && isRpcMissingError(error)) {
      logger.warn("verification.rpc_missing_using_insert", {
        message: error.message,
        code: error.code,
        status: (error as { status?: number }).status,
      });
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

  if (!isCloudVerificationEnabled()) {
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

export type VerificationEnsureReason =
  | "invalid_format"
  | "device_not_announced"
  | "already_valid"
  | "registered_new_session"
  | "create_failed"
  | "local_mock";

export type VerificationEnsureResult = {
  ok: boolean;
  normalizedCode: string;
  reason: VerificationEnsureReason;
  /** جلسات المالك المطابقة (للتشخيص) */
  dbSessions?: Array<{ id: string; code: string | null; expiresAt: string; expired: boolean }>;
};

type PairingSessionRow = {
  id: string;
  code: string | null;
  expires_at: string;
};

async function fetchOwnerSessionsForCode(
  ownerId: string,
  normalized: string,
): Promise<PairingSessionRow[]> {
  const { data, error } = await getSupabase()
    .from("device_pairing_sessions")
    .select("id, code, expires_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    logger.warn("verification.sessions_fetch_failed", { message: error.message });
    return [];
  }

  return (data ?? []).filter(
    (row) => row.code && row.code.trim().toUpperCase() === normalized,
  ) as PairingSessionRow[];
}

function toDiagnosticSessions(rows: PairingSessionRow[]) {
  const now = Date.now();
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    expiresAt: row.expires_at,
    expired: new Date(row.expires_at).getTime() <= now,
  }));
}

async function isKioskPairingAnnounced(code: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc("is_kiosk_pairing_announced", {
    p_code: code,
  });

  if (error) {
    logger.warn("verification.announce_check_failed", { message: error.message, code });
    return false;
  }

  return Boolean(data);
}

/**
 * يضمن وجود جلسة تحقق صالحة للمالك قبل التفعيل.
 * رمز الآيباد يُولَّد محلياً ولا يُكتب في Supabase — نسجّله هنا عند التفعيل من لوحة التحكم.
 */
export async function ensureOwnerVerificationSession(
  code: string,
  ownerId: string,
): Promise<VerificationEnsureResult> {
  const normalized = code.trim().toUpperCase();

  logger.info("verification.ensure_start", {
    inputCode: code,
    normalizedCode: normalized,
    ownerId,
  });

  if (!isValidDeviceCode(normalized)) {
    logger.warn("verification.ensure_invalid_format", { inputCode: code, normalizedCode: normalized });
    return { ok: false, normalizedCode: normalized, reason: "invalid_format" };
  }

  if (!isCloudVerificationEnabled()) {
    const valid = await validateVerificationCode(normalized);
    logger.info("verification.ensure_local", { normalizedCode: normalized, valid });
    return { ok: valid, normalizedCode: normalized, reason: "local_mock" };
  }

  const announced = await isKioskPairingAnnounced(normalized);
  if (!announced) {
    logger.warn("verification.ensure_not_announced", { normalizedCode: normalized });
    return { ok: false, normalizedCode: normalized, reason: "device_not_announced" };
  }

  const supabase = getSupabase();
  const existingRows = await fetchOwnerSessionsForCode(ownerId, normalized);
  const dbSessions = toDiagnosticSessions(existingRows);

  const { data: alreadyValid, error: verifyErr } = await supabase.rpc(
    "verify_owner_verification_code",
    { p_code: normalized },
  );

  if (verifyErr) {
    logger.error("verification.owner_check_failed", {
      message: verifyErr.message,
      normalizedCode: normalized,
      dbSessions,
    });
    return { ok: false, normalizedCode: normalized, reason: "create_failed", dbSessions };
  }

  logger.info("verification.owner_check", {
    inputCode: code,
    normalizedCode: normalized,
    dbMatch: dbSessions,
    verifyResult: Boolean(alreadyValid),
  });

  if (alreadyValid) {
    return { ok: true, normalizedCode: normalized, reason: "already_valid", dbSessions };
  }

  const { data: sessionId, error: createErr } = await supabase.rpc(
    "create_device_verification_code",
    { p_code: normalized },
  );

  if (createErr) {
    logger.warn("verification.ensure_rpc_create_failed", {
      message: createErr.message,
      normalizedCode: normalized,
    });
    try {
      const fallbackId = await createVerificationCodeInTable(ownerId, normalized);
      logger.info("verification.session_registered_fallback", {
        normalizedCode: normalized,
        sessionId: fallbackId,
      });
    } catch (insertErr) {
      logger.error("verification.ensure_create_failed", {
        normalizedCode: normalized,
        rpcError: createErr.message,
        insertError: insertErr instanceof Error ? insertErr.message : String(insertErr),
        dbSessions,
      });
      return { ok: false, normalizedCode: normalized, reason: "create_failed", dbSessions };
    }
  } else {
    logger.info("verification.session_registered", {
      normalizedCode: normalized,
      sessionId: String(sessionId),
    });
  }

  const refreshedRows = await fetchOwnerSessionsForCode(ownerId, normalized);
  const refreshedSessions = toDiagnosticSessions(refreshedRows);

  const { data: validAfter, error: reverifyErr } = await supabase.rpc(
    "verify_owner_verification_code",
    { p_code: normalized },
  );

  if (reverifyErr) {
    logger.error("verification.reverify_failed", { message: reverifyErr.message, normalizedCode: normalized });
    return { ok: false, normalizedCode: normalized, reason: "create_failed", dbSessions: refreshedSessions };
  }

  const ok = Boolean(validAfter);
  logger.info("verification.ensure_done", {
    inputCode: code,
    normalizedCode: normalized,
    dbMatch: refreshedSessions,
    verifyResult: ok,
    reason: ok ? "registered_new_session" : "create_failed",
  });

  return {
    ok,
    normalizedCode: normalized,
    reason: ok ? "registered_new_session" : "create_failed",
    dbSessions: refreshedSessions,
  };
}

/** تحقق أن الكود صادر من لوحة التحكم لنفس المالك المسجّل */
export async function verifyOwnerVerificationCode(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (!isValidDeviceCode(normalized)) return false;

  if (!isCloudVerificationEnabled()) {
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
  if (!isCloudVerificationEnabled()) return;

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

  if (isCloudVerificationEnabled()) {
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

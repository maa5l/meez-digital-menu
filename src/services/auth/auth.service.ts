import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { setSession, clearSession, createMockSession } from "@/security/session";
import type { AuthSession } from "@/types/domain";
import { appEnv } from "@/config/env";
import {
  initializeVenueForUser,
  isVenueEffectivelyEmpty,
  loadVenueData,
  saveVenueData,
  syncVenueNameFromProfile,
} from "@/lib/venue-store";
import { shouldUseVenueDatabase } from "@/services/venue/venue-supabase.service";
import {
  ensureUserProfile,
  ensureVenueRecordForOwner,
  fetchUserProfile,
} from "@/services/auth/profile-supabase.service";
import { usesSupabaseAuth } from "@/config/env";
import { logger } from "@/lib/logger";
import {
  ensureSubscriptionRecord,
  resetSubscriptionEnsureCache,
} from "@/services/subscription/subscription-enforcement";

const SIGNUP_TRIAL_WINDOW_MS = 24 * 60 * 60 * 1000;

async function repairSignupTrialIfNeeded(user: User): Promise<void> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) return;

  const createdAt = user.created_at ? Date.parse(user.created_at) : NaN;
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > SIGNUP_TRIAL_WINDOW_MS) {
    return;
  }

  const { error } = await getSupabase().rpc("repair_signup_trial");
  if (error) {
    logger.warn("auth.repair_signup_trial_failed", { message: error.message, code: error.code });
  }
}

const hydrateVenueInFlight = new Map<string, Promise<void>>();
const hydrateVenueDoneAt = new Map<string, number>();
const HYDRATE_COOLDOWN_MS = 45_000;

async function hydrateVenueForUser(
  userId: string,
  venueName?: string,
  opts?: { force?: boolean },
): Promise<void> {
  const force = opts?.force === true;
  const recent = hydrateVenueDoneAt.get(userId) ?? 0;
  if (!force && Date.now() - recent < HYDRATE_COOLDOWN_MS) {
    return;
  }

  const existingRun = hydrateVenueInFlight.get(userId);
  if (existingRun) {
    await existingRun;
    return;
  }

  const run = (async () => {
    if (shouldUseVenueDatabase()) {
      const {
        countVenueProductImages,
        hydrateVenueFromIdbIfNeeded,
        pullVenueFromCloudDetailed,
      } = await import("@/lib/venue-store");
      await hydrateVenueFromIdbIfNeeded(userId);

      const local = loadVenueData(userId);
      const localReady =
        !isVenueEffectivelyEmpty(local) &&
        (local.products.length === 0 || countVenueProductImages(local) > 0);

      // إذا المحلي جاهز: سحب خفيف يعتمد على updated_at بدل إعادة تنزيل 3MB
      let outcome = await pullVenueFromCloudDetailed(userId, force || !localReady);
      if (
        outcome.pullFailed ||
        (isVenueEffectivelyEmpty(outcome.venue) && outcome.remoteUpdatedAt)
      ) {
        await new Promise((r) => setTimeout(r, 800));
        outcome = await pullVenueFromCloudDetailed(userId, true);
      }
      if (!isVenueEffectivelyEmpty(outcome.venue)) {
        hydrateVenueDoneAt.set(userId, Date.now());
        return;
      }

      // سحابة موجودة لكن السحب فشل: لا تلمس شيئاً ولا تُنشئ فارغاً
      if (outcome.pullFailed || outcome.remoteUpdatedAt) return;

      const existing = loadVenueData(userId);
      if (existing.version === 1 && !isVenueEffectivelyEmpty(existing)) return;
      // حساب جديد فعلاً بلا صف سحابي — محلي فقط
      initializeVenueForUser(userId, venueName);
      return;
    }
    initializeVenueForUser(userId, venueName);
  })();

  hydrateVenueInFlight.set(userId, run);
  try {
    await run;
  } finally {
    if (hydrateVenueInFlight.get(userId) === run) {
      hydrateVenueInFlight.delete(userId);
    }
  }
}

async function syncAccountWithVenue(userId: string): Promise<void> {
  const profile = await fetchUserProfile(userId);
  if (!profile) return;
  const venue = loadVenueData(userId);
  const next = syncVenueNameFromProfile(venue, profile.venueName);
  if (next !== venue) saveVenueData(userId, next);
}

async function runAuthStep(
  label: string,
  userId: string,
  run: () => Promise<void>,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    logger.warn("auth.after_auth_step_failed", {
      step: label,
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function afterSupabaseAuth(session: Session, venueName?: string): Promise<void> {
  // Soft-fail — خطوات مستقلة بالتوازي لتقليل زمن الدخول
  const userId = session.user.id;
  const metaVenue =
    venueName || (session.user.user_metadata?.venue_name as string | undefined);

  // ثبّت الجلسة على العميل قبل أي RPC — يمنع not_authenticated المتوازي بعد الدخول
  const supabase = getSupabase();
  await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  const started = Date.now();
  while (Date.now() - started < 5_000) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.id === userId && data.session.access_token) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  await Promise.all([
    runAuthStep("ensure_profile", userId, () => ensureUserProfile(session.user, venueName)),
    runAuthStep("repair_signup_trial", userId, () => repairSignupTrialIfNeeded(session.user)),
    runAuthStep("ensure_subscription", userId, () => ensureSubscriptionRecord(userId)),
    runAuthStep("ensure_venue", userId, () => ensureVenueRecordForOwner()),
  ]);

  await runAuthStep("hydrate_venue", userId, () =>
    hydrateVenueForUser(userId, metaVenue, { force: true }),
  );
  await runAuthStep("sync_account_venue", userId, () => syncAccountWithVenue(userId));
}

function mapSupabaseSession(session: Session): AuthSession {
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    role: "owner",
    expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + 8 * 60 * 60 * 1000,
  };
}

export function syncSessionFromSupabase(session: Session | null): AuthSession | null {
  if (!session) {
    clearSession();
    return null;
  }
  const mapped = mapSupabaseSession(session);
  setSession(mapped);
  return mapped;
}

function isInvalidRefreshTokenError(error: unknown): boolean {
  const msg =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message)
      : String(error ?? "");
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  return (
    code === "refresh_token_not_found" ||
    /refresh.?token.*(not found|invalid)/i.test(msg)
  );
}

/** يمسح جلسة محلية فاسدة بعد إعادة تعيين كلمة المرور أو انتهاء refresh token */
export async function recoverInvalidRefreshSession(): Promise<boolean> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) return false;
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error && isInvalidRefreshTokenError(error)) {
      await supabase.auth.signOut({ scope: "local" });
      clearSession();
      logger.warn("auth.refresh_token_cleared", { reason: "get_session" });
      return true;
    }

    const session = data.session;
    if (!session?.refresh_token) return false;

    const expiresAtMs = session.expires_at ? session.expires_at * 1000 : 0;
    // فقط عندما قربت الصلاحية — تجنب refresh على كل تحميل
    if (expiresAtMs && expiresAtMs > Date.now() + 90_000) return false;

    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError && isInvalidRefreshTokenError(refreshError)) {
      await supabase.auth.signOut({ scope: "local" });
      clearSession();
      logger.warn("auth.refresh_token_cleared", { reason: "refresh_session" });
      return true;
    }
  } catch (err) {
    if (isInvalidRefreshTokenError(err)) {
      try {
        await getSupabase().auth.signOut({ scope: "local" });
      } catch {
        /* ignore */
      }
      clearSession();
      return true;
    }
  }
  return false;
}

export async function getActiveSession(): Promise<AuthSession | null> {
  if (isSupabaseConfigured() && !appEnv.useLocalMockAuth) {
    await recoverInvalidRefreshSession();
    const { data, error } = await getSupabase().auth.getSession();
    if (error) {
      if (isInvalidRefreshTokenError(error)) {
        await getSupabase().auth.signOut({ scope: "local" });
        clearSession();
        return null;
      }
      throw error;
    }
    if (data.session) {
      const userId = data.session.user.id;
      const venueName =
        (data.session.user.user_metadata?.venue_name as string | undefined) ?? "";
      // سحب خفيف فقط عند استعادة الجلسة — تجنّب إعادة تنزيل المنيو الثقيلة في كل تنقّل
      await runAuthStep("hydrate_venue", userId, () =>
        hydrateVenueForUser(userId, venueName || undefined, { force: false }),
      );
    }
    return syncSessionFromSupabase(data.session);
  }
  const { getSession } = await import("@/security/session");
  return getSession();
}

function isEmailNotConfirmed(error: unknown): boolean {
  const msg =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message)
      : String(error ?? "");
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  return (
    code === "email_not_confirmed" ||
    msg.toLowerCase().includes("email not confirmed") ||
    msg.includes("email_not_confirmed")
  );
}

function mapPasswordAuthError(error: unknown): Error {
  if (!(error && typeof error === "object" && "message" in error)) {
    return new Error("تعذّر تسجيل الدخول");
  }
  const msg = String((error as { message?: string }).message).toLowerCase();
  if (isEmailNotConfirmed(error)) {
    return new Error("البريد الإلكتروني غير مؤكد. تحقق من بريدك أو تواصل مع الدعم.");
  }
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
    return new Error("البريد أو كلمة المرور غير صحيحة.");
  }
  if (/database error querying schema/i.test(msg)) {
    return new Error(
      "تعذّر التحقق من الحساب في قاعدة البيانات. حاول لاحقاً أو تواصل مع الدعم.",
    );
  }
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return new Error(
      "تعذّر الاتصال بـ Supabase. تحقق من الإنترنت و VITE_SUPABASE_URL في .env.local",
    );
  }
  return error instanceof Error ? error : new Error(String((error as { message?: string }).message));
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    if (!appEnv.enableMockAuth && appEnv.isProd) {
      throw new Error("المصادقة غير متاحة. اضبط Supabase في البيئة.");
    }
    const session = createMockSession(normalizedEmail);
    setSession(session);
    initializeVenueForUser(session.userId);
    return;
  }

  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  logger.debug("auth.signInWithPassword.response", {
    email: normalizedEmail,
    hasError: Boolean(error),
    hasSession: Boolean(data.session),
  });

  if (error) throw mapPasswordAuthError(error);
  if (!data.session) {
    throw new Error("لم يتم إنشاء جلسة. تحقق من إعدادات Supabase Auth.");
  }

  // Establish app session first; cloud hydration must not cancel a successful login.
  syncSessionFromSupabase(data.session);
  await afterSupabaseAuth(data.session);
  logger.audit("auth.password_login", { email: normalizedEmail });
  try {
    const { writeClientAuditLog } = await import("@/services/core/platform-security");
    await writeClientAuditLog("auth.login", { email: normalizedEmail });
  } catch {
    /* ignore audit transport failures */
  }
}

export async function signUp(
  email: string,
  password: string,
  venueName?: string,
  phone?: string,
): Promise<{ needsEmailConfirmation: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone?.trim() || "";

  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    const session = createMockSession(normalizedEmail);
    setSession(session);
    initializeVenueForUser(session.userId, venueName);
    return { needsEmailConfirmation: false };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        venue_name: venueName ?? "",
        phone: normalizedPhone,
      },
    },
  });

  if (error) throw error;

  if (data.session) {
    syncSessionFromSupabase(data.session);
    await afterSupabaseAuth(data.session, venueName);
    logger.audit("auth.register", { email: normalizedEmail, venueName: venueName ?? "" });
    try {
      const { writeClientAuditLog } = await import("@/services/core/platform-security");
      await writeClientAuditLog("auth.register", {
        email: normalizedEmail,
        venue_name: venueName ?? "",
        source: "client_signup",
      });
    } catch {
      /* ignore audit transport failures */
    }
    return { needsEmailConfirmation: false };
  }

  try {
    await signInWithPassword(normalizedEmail, password);
    return { needsEmailConfirmation: false };
  } catch (loginError) {
    if (isEmailNotConfirmed(loginError)) {
      throw new Error("تم إنشاء الحساب. يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.");
    }
    throw loginError;
  }
}

export { usesSupabaseAuth };

export async function signOut(): Promise<void> {
  logger.audit("auth.logout");
  resetSubscriptionEnsureCache();
  if (isSupabaseConfigured()) {
    await getSupabase().auth.signOut();
  }
  clearSession();
}

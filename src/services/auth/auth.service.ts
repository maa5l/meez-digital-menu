import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { setSession, clearSession, createMockSession } from "@/security/session";
import type { AuthSession } from "@/types/domain";
import { appEnv } from "@/config/env";
import {
  initializeVenueForUser,
  isVenueEffectivelyEmpty,
  loadVenueData,
  pullVenueFromCloud,
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

async function hydrateVenueForUser(userId: string, venueName?: string): Promise<void> {
  if (shouldUseVenueDatabase()) {
    const venue = await pullVenueFromCloud(userId);
    // لا تُنشئ منشأة فارغة وتُحفظ للسحابة إلا إن كانت السحابة فعلاً بلا صف محتوى
    if (isVenueEffectivelyEmpty(venue)) {
      const existing = loadVenueData(userId);
      if (existing.version === 1 && !isVenueEffectivelyEmpty(existing)) return;
      initializeVenueForUser(userId, venueName);
    }
    return;
  }
  initializeVenueForUser(userId, venueName);
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

  await Promise.all([
    runAuthStep("ensure_profile", userId, () => ensureUserProfile(session.user, venueName)),
    runAuthStep("repair_signup_trial", userId, () => repairSignupTrialIfNeeded(session.user)),
    runAuthStep("ensure_subscription", userId, () => ensureSubscriptionRecord(userId)),
    runAuthStep("ensure_venue", userId, () => ensureVenueRecordForOwner()),
  ]);

  await runAuthStep("hydrate_venue", userId, () => hydrateVenueForUser(userId, metaVenue));
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

export async function getActiveSession(): Promise<AuthSession | null> {
  if (isSupabaseConfigured() && !appEnv.useLocalMockAuth) {
    const { data, error } = await getSupabase().auth.getSession();
    if (error) throw error;
    if (data.session) {
      const venueName =
        (data.session.user.user_metadata?.venue_name as string | undefined) ?? "";
      await hydrateVenueForUser(data.session.user.id, venueName || undefined);
      await syncAccountWithVenue(data.session.user.id);
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
    logger.audit("auth.register", { email: normalizedEmail });
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

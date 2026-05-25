import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { setSession, clearSession, createMockSession } from "@/security/session";
import type { AuthSession } from "@/types/domain";
import { appEnv, resolveAppOrigin } from "@/config/env";
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
import { ensureSubscriptionRecord } from "@/services/subscription/subscription-enforcement";

async function hydrateVenueForUser(userId: string, venueName?: string): Promise<void> {
  if (shouldUseVenueDatabase()) {
    const venue = await pullVenueFromCloud(userId);
    if (isVenueEffectivelyEmpty(venue)) {
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

async function afterSupabaseAuth(session: Session, venueName?: string): Promise<void> {
  await ensureUserProfile(session.user, venueName);
  await ensureSubscriptionRecord();
  await ensureVenueRecordForOwner();
  await hydrateVenueForUser(
    session.user.id,
    venueName || (session.user.user_metadata?.venue_name as string | undefined),
  );
  await syncAccountWithVenue(session.user.id);
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
      await hydrateVenueForUser(
        data.session.user.id,
        venueName || undefined,
      );
      await syncAccountWithVenue(data.session.user.id);
    }
    return syncSessionFromSupabase(data.session);
  }
  const { getSession } = await import("@/security/session");
  return getSession();
}

export async function signUp(
  email: string,
  password: string,
  venueName?: string,
): Promise<{ needsEmailConfirmation: boolean }> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    const session = createMockSession(email);
    setSession(session);
    initializeVenueForUser(session.userId, venueName);
    return { needsEmailConfirmation: false };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { venue_name: venueName ?? "" },
      emailRedirectTo: `${resolveAppOrigin()}/auth`,
    },
  });

  if (error) throw error;

  if (data.session) {
    await afterSupabaseAuth(data.session, venueName);
    syncSessionFromSupabase(data.session);
    return { needsEmailConfirmation: false };
  }

  if (data.user) {
    logger.audit("auth.signup_pending_confirmation", { userId: data.user.id });
  }

  return { needsEmailConfirmation: true };
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

function isEmailRateLimitError(error: unknown): boolean {
  const msg =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message).toLowerCase()
      : String(error ?? "").toLowerCase();
  const status =
    error && typeof error === "object" && "status" in error
      ? Number((error as { status?: number }).status)
      : undefined;
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code).toLowerCase()
      : "";

  return (
    status === 429 ||
    code.includes("rate_limit") ||
    msg.includes("rate limit") ||
    msg.includes("too many") ||
    msg.includes("over_email_send_rate_limit")
  );
}

/** إرسال رمز 6 أرقام إلى البريد — تسجيل دخول الحساب فقط (لا علاقة بكود الشاشات QM-XXXX) */
export async function sendLoginOtp(email: string): Promise<void> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    if (!appEnv.enableMockAuth && appEnv.isProd) {
      throw new Error("المصادقة غير متاحة. اضبط Supabase في البيئة.");
    }
    logger.audit("auth.login_otp_mock_sent", { email });
    return;
  }

  const { error } = await getSupabase().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: false,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (isEmailRateLimitError(error)) {
      throw new Error("تم طلب رموز كثيرة خلال وقت قصير. انتظر دقيقة ثم جرّب مرة أخرى.");
    }
    if (msg.includes("signups not allowed") || msg.includes("user not found")) {
      throw new Error("لا يوجد حساب بهذا البريد. أنشئ حساباً جديداً أولاً.");
    }
    if (msg.includes("provider") || msg.includes("disabled") || msg.includes("email not enabled")) {
      throw new Error(
        "تعذّر إرسال الرمز. فعّل Email OTP في Supabase: Authentication → Providers → Email.",
      );
    }
    throw error;
  }

  logger.audit("auth.login_otp_sent", { email });
}

/** التحقق من رمز 6 أرقام وإنشاء الجلسة */
export async function verifyLoginOtp(email: string, otp: string): Promise<void> {
  const token = otp.trim();

  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    if (!appEnv.enableMockAuth && appEnv.isProd) {
      throw new Error("المصادقة غير متاحة. اضبط Supabase في البيئة.");
    }
    if (!/^\d{6}$/.test(token)) {
      throw new Error("أدخل رمز التحقق المكوّن من 6 أرقام");
    }
    const session = createMockSession(email);
    setSession(session);
    initializeVenueForUser(session.userId);
    return;
  }

  const { data, error } = await getSupabase().auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token,
    type: "email",
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("expired") || msg.includes("invalid") || msg.includes("otp")) {
      throw new Error("رمز التحقق غير صحيح أو منتهٍ. اطلب رمزاً جديداً.");
    }
    throw error;
  }

  if (!data.session) {
    throw new Error("لم يتم إنشاء جلسة. تحقق من الرمز أو اطلب رمزاً جديداً.");
  }

  await afterSupabaseAuth(data.session);
  syncSessionFromSupabase(data.session);
}

/** إرسال رمز 6 أرقام لإعادة تعيين كلمة المرور */
export async function sendPasswordResetOtp(email: string): Promise<void> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    if (!appEnv.enableMockAuth && appEnv.isProd) {
      throw new Error("المصادقة غير متاحة. اضبط Supabase في البيئة.");
    }
    logger.audit("auth.password_reset_otp_mock_sent", { email });
    return;
  }

  const { error } = await getSupabase().auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
  );

  if (error) {
    if (isEmailRateLimitError(error)) {
      throw new Error("تم طلب رموز كثيرة خلال وقت قصير. انتظر دقيقة ثم جرّب مرة أخرى.");
    }
    throw error;
  }

  logger.audit("auth.password_reset_otp_sent", { email });
}

/** التحقق من رمز الاستعادة ثم حفظ كلمة المرور الجديدة */
export async function resetPasswordWithOtp(
  email: string,
  otp: string,
  password: string,
): Promise<void> {
  const token = otp.trim();

  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    if (!appEnv.enableMockAuth && appEnv.isProd) {
      throw new Error("المصادقة غير متاحة. اضبط Supabase في البيئة.");
    }
    if (!/^\d{6}$/.test(token)) {
      throw new Error("أدخل رمز التحقق المكوّن من 6 أرقام");
    }
    return;
  }

  const { data, error } = await getSupabase().auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token,
    type: "recovery",
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("expired") || msg.includes("invalid") || msg.includes("otp")) {
      throw new Error("رمز إعادة التعيين غير صحيح أو منتهٍ. اطلب رمزاً جديداً.");
    }
    throw error;
  }

  if (!data.session) {
    throw new Error("لم يتم التحقق من الرمز. اطلب رمزاً جديداً.");
  }

  const { error: updateError } = await getSupabase().auth.updateUser({ password });
  if (updateError) throw updateError;

  await getSupabase().auth.signOut();
  clearSession();
}

export { usesSupabaseAuth };

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    await getSupabase().auth.signOut();
  }
  clearSession();
}

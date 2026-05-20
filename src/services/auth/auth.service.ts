import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { setSession, clearSession, createMockSession } from "@/security/session";
import type { AuthSession } from "@/types/domain";
import { appEnv } from "@/config/env";
import {
  initializeVenueForUser,
  isVenueEffectivelyEmpty,
  pullVenueFromCloud,
} from "@/lib/venue-store";
import { shouldUseVenueDatabase } from "@/services/venue/venue-supabase.service";
import { ensureUserProfile } from "@/services/auth/profile-supabase.service";
import { usesSupabaseAuth } from "@/config/env";
import { logger } from "@/lib/logger";

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

async function afterSupabaseAuth(session: Session, venueName?: string): Promise<void> {
  await ensureUserProfile(session.user, venueName);
  await hydrateVenueForUser(
    session.user.id,
    venueName || (session.user.user_metadata?.venue_name as string | undefined),
  );
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
      emailRedirectTo: `${appEnv.appUrl}/auth`,
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

export async function signIn(email: string, password: string): Promise<void> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    if (!appEnv.enableMockAuth && appEnv.isProd) {
      throw new Error("المصادقة غير متاحة");
    }
    const session = createMockSession(email);
    setSession(session);
    initializeVenueForUser(session.userId);
    return;
  }

  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });

  if (error) {
    if (isEmailNotConfirmed(error)) {
      throw new Error("فعّل حسابك من رابط البريد الإلكتروني أولاً");
    }
    throw error;
  }

  if (!data.session) throw new Error("لم يتم إنشاء جلسة. تحقق من تفعيل البريد.");
  await afterSupabaseAuth(data.session);
  syncSessionFromSupabase(data.session);
}

export { usesSupabaseAuth };

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    await getSupabase().auth.signOut();
  }
  clearSession();
}

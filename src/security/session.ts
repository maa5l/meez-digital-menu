import { appEnv } from "@/config/env";
import { SESSION_KEYS } from "@/constants/storage";
import type { AuthSession } from "@/types/domain";
import { rememberOwnerUserId } from "@/lib/venue-store";
import { logger } from "@/lib/logger";

/**
 * جلسة المصادقة — sessionStorage فقط (لا localStorage للـ auth).
 * في الإنتاج: استبدل بـ httpOnly cookies + JWT من الخادم.
 */

function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEYS.AUTH);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (session.expiresAt < Date.now()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function getSession(): AuthSession | null {
  return readSession();
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function setSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEYS.AUTH, JSON.stringify(session));
  rememberOwnerUserId(session.userId);
  logger.audit("auth.session_created", { userId: session.userId, role: session.role });
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEYS.AUTH);
  logger.audit("auth.session_cleared");
}

function mockUserIdFromEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return `mock-${Math.abs(hash).toString(36)}`;
}

/** جلسة تجريبية — فقط عند تفعيل VITE_ENABLE_MOCK_AUTH=true */
export function createMockSession(email: string): AuthSession {
  if (!appEnv.enableMockAuth && appEnv.isProd) {
    throw new Error("Mock authentication is disabled in production");
  }
  return {
    userId: mockUserIdFromEmail(email),
    email,
    role: "owner",
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  };
}

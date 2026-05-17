import { logger } from "@/lib/logger";

/**
 * تخزين آمن للبيانات غير الحساسة فقط (إعدادات UI، تفضيلات).
 * لا تخزّن: tokens، كلمات مرور، مفاتيح API، بيانات بطاقات.
 */

export function getLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn("storage.read_failed", { key, error: String(error) });
    return fallback;
  }
}

export function setLocalJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logger.warn("storage.write_failed", { key, error: String(error) });
  }
}

export function getLocalString(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

export function setLocalString(key: string, value: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value);
}

export function removeLocal(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

import { DEVICE_CODE_PATTERN } from "@/config/app";
import { STORAGE_KEYS } from "@/constants/storage";
import { getLocalString, setLocalString } from "@/security/storage";
import { getSession } from "@/security/session";
import { linkDeviceToOwner, refreshDeviceVenueSync, setDeviceMenuType } from "@/lib/venue-store";
import { logger } from "@/lib/logger";

const ACTIVATION_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateDeviceCode(): string {
  const segment = Array.from({ length: 4 }, () =>
    ACTIVATION_CHARS[Math.floor(Math.random() * ACTIVATION_CHARS.length)],
  ).join("");
  return `QM-${segment}`;
}

export function isValidDeviceCode(code: string): boolean {
  return DEVICE_CODE_PATTERN.test(code.trim().toUpperCase());
}

export function getPendingDeviceCode(): string | null {
  return getLocalString(STORAGE_KEYS.DEVICE_PENDING_CODE);
}

export function getOrCreatePendingDeviceCode(): string {
  const existing = getPendingDeviceCode();
  if (existing && isValidDeviceCode(existing)) return existing.toUpperCase();

  const code = generateDeviceCode();
  setLocalString(STORAGE_KEYS.DEVICE_PENDING_CODE, code);
  logger.audit("device.code_generated");
  return code;
}

export function isDeviceActivated(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  if (!isValidDeviceCode(normalized)) return false;
  return getLocalString(`${STORAGE_KEYS.DEVICE_ACTIVATED_PREFIX}${normalized}`) === "1";
}

export function activateDevice(
  code: string,
  options?: { menuType?: "products" | "crops" },
): void {
  const normalized = code.trim().toUpperCase();
  if (!isValidDeviceCode(normalized)) {
    throw new Error("رمز التفعيل غير صالح");
  }
  setLocalString(`${STORAGE_KEYS.DEVICE_ACTIVATED_PREFIX}${normalized}`, "1");

  if (options?.menuType) {
    setDeviceMenuType(normalized, options.menuType);
  }

  const ownerId = getSession()?.userId;
  if (ownerId) {
    linkDeviceToOwner(normalized, ownerId);
    refreshDeviceVenueSync(normalized, ownerId);
  }

  logger.audit("device.activated", { code: normalized, linked: !!ownerId });
}

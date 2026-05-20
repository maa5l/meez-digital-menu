import { DEVICE_CODE_PATTERN } from "@/config/app";
import { STORAGE_KEYS } from "@/constants/storage";
import { getLocalString, setLocalString } from "@/security/storage";
import { getSession } from "@/security/session";
import { linkDeviceToOwner, refreshDeviceVenueSync, setDeviceMenuType } from "@/lib/venue-store";
import { logger } from "@/lib/logger";
import {
  isDeviceActivatedInDatabase,
  shouldUseVenueDatabase,
  upsertDeviceActivationInDatabase,
} from "@/services/venue/venue-supabase.service";

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

export function setPendingDeviceCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!isValidDeviceCode(normalized)) {
    throw new Error("رمز التفعيل غير صالح");
  }
  setLocalString(STORAGE_KEYS.DEVICE_PENDING_CODE, normalized);
  return normalized;
}

export function getOrCreatePendingDeviceCode(): string {
  const existing = getPendingDeviceCode();
  if (existing && isValidDeviceCode(existing)) return existing.toUpperCase();

  return setPendingDeviceCode(generateDeviceCode());
}

/** رمز جديد للربط من لوحة التحكم (لا يعتمد على تخزين الآيباد) */
export function createPairingCode(): string {
  const code = generateDeviceCode();
  logger.audit("device.pairing_code_created", { code });
  return code;
}

export function resolveDeviceCode(codeParam?: string | null): string {
  if (codeParam) {
    const normalized = setPendingDeviceCode(codeParam);
    return normalized;
  }
  return getOrCreatePendingDeviceCode();
}

export function isDeviceActivated(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  if (!isValidDeviceCode(normalized)) return false;
  return getLocalString(`${STORAGE_KEYS.DEVICE_ACTIVATED_PREFIX}${normalized}`) === "1";
}

export async function isDeviceActivatedAsync(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (!isValidDeviceCode(normalized)) return false;
  if (isDeviceActivated(normalized)) return true;
  if (!shouldUseVenueDatabase()) return false;
  return isDeviceActivatedInDatabase(normalized);
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
    if (shouldUseVenueDatabase()) {
      void upsertDeviceActivationInDatabase(normalized, ownerId, options?.menuType).catch((err) => {
        logger.error("device.cloud_activation_failed", {
          code: normalized,
          message: err instanceof Error ? err.message : String(err),
        });
      });
    }
  }

  logger.audit("device.activated", { code: normalized, linked: !!ownerId });
}

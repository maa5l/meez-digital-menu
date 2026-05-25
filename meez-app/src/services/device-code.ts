import { DEVICE_CODE_PATTERN } from "@/config/app";
import { getDeviceCode, setDeviceCode } from "@/security/storage";

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

export async function getOrCreateDeviceCode(): Promise<string> {
  const existing = await getDeviceCode();
  if (existing && isValidDeviceCode(existing)) {
    return existing.toUpperCase();
  }
  const code = generateDeviceCode();
  await setDeviceCode(code);
  return code;
}

export async function resolveDeviceCodeFromUrl(
  urlCode: string | null | undefined,
): Promise<string> {
  if (urlCode && isValidDeviceCode(urlCode)) {
    const normalized = urlCode.trim().toUpperCase();
    await setDeviceCode(normalized);
    return normalized;
  }
  return getOrCreateDeviceCode();
}

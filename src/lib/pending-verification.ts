import { getLocalJson, setLocalJson } from "@/security/storage";

const PENDING_KEY = "meez:pending-verification";
const TTL_MS = 30 * 60 * 1000;

export type PendingVerification = {
  code: string;
  menuType: "products" | "crops";
  createdAt: number;
};

export function savePendingVerification(code: string, menuType: "products" | "crops"): void {
  setLocalJson(PENDING_KEY, {
    code: code.trim().toUpperCase(),
    menuType,
    createdAt: Date.now(),
  });
}

export function getPendingVerification(): PendingVerification | null {
  const row = getLocalJson<PendingVerification | null>(PENDING_KEY, null);
  if (!row?.code) return null;
  if (Date.now() - row.createdAt > TTL_MS) return null;
  return row;
}

export function clearPendingVerification(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_KEY);
}

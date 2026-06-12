import type { Product } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";
import { sanitizeHexColor } from "@/security/sanitize";

export const BADGE_TEXT_MAX = 24;

export const BADGE_COLOR_PRESETS = [
  { label: "أحمر", value: "#dc2626" },
  { label: "أزرق", value: "#2563eb" },
  { label: "أخضر", value: "#16a34a" },
  { label: "ذهبي", value: "#d97706" },
  { label: "بنفسجي", value: "#7c3aed" },
  { label: "وردي", value: "#db2777" },
] as const;

export const BADGE_TEXT_PRESETS = [
  "الأكثر مبيعاً",
  "جديد",
  "مشروب الشهر",
  "عرض خاص",
  "مميز",
] as const;

export function normalizeBadgeColor(input: unknown, fallback = "#dc2626"): string {
  return sanitizeHexColor(input) ?? fallback;
}

export function productBadgeLabel(product: Product, lang: MenuLang): string | null {
  const ar = product.badgeText?.trim();
  const en = product.badgeTextEn?.trim();
  if (lang === "en") {
    const text = en || ar;
    return text ? text.slice(0, BADGE_TEXT_MAX) : null;
  }
  return ar ? ar.slice(0, BADGE_TEXT_MAX) : null;
}

export function productBadgeColor(product: Product): string | null {
  if (!product.badgeColor?.trim()) return null;
  return normalizeBadgeColor(product.badgeColor);
}

export function hasProductBadge(product: Product, lang: MenuLang): boolean {
  return Boolean(productBadgeLabel(product, lang) && productBadgeColor(product));
}

/** لون نص مقروء على خلفية الشارة */
export function badgeForeground(hex: string): string {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return "#ffffff";
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#1a1a1a" : "#ffffff";
}

export type {
  Category,
  Product,
  CropInfo,
  Device,
  MenuSettings,
  ProductTemplate,
  CropsTemplate,
  Crop,
} from "@/types/domain";

import type { MenuSettings, ProductTemplate } from "@/types/domain";
import { STORAGE_KEYS } from "@/constants/storage";
import { getLocalJson, setLocalJson, getLocalString } from "@/security/storage";
import { menuSettingsSchema } from "@/validations/menu-settings.schema";
import { sanitizeHexColor, sanitizeImageUrl } from "@/security/sanitize";
import { logger } from "@/lib/logger";

/** إعدادات المنيو الافتراضية — بدون بيانات تجريبية */
export const defaultMenuSettings: MenuSettings = {
  productTemplate: "featured",
  cropsTemplate: "molo",
  bgColor: "#F1EFEC",
  textColor: "#030303",
  accentColor: "#3068A8",
  showBurnBar: true,
  showLanguageToggle: true,
  cardColor: "#ededed",
  burnBarText: "تفاصيل حرق السعرات",
  burnBarTextEn: "Calorie burn details",
};

const normalizeProductTemplate = (value: unknown): ProductTemplate => {
  if (value === "detail" || value === "split") return "detail";
  return "featured";
};

function migrateLegacySettings(): MenuSettings | null {
  const legacy = getLocalString(STORAGE_KEYS.LEGACY_MENU_SETTINGS);
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy) as Partial<MenuSettings>;
      return {
        ...defaultMenuSettings,
        ...parsed,
        productTemplate: normalizeProductTemplate(parsed?.productTemplate),
      };
    } catch {
      return null;
    }
  }
  const oldTpl = getLocalString(STORAGE_KEYS.LEGACY_TEMPLATE);
  if (oldTpl) {
    return {
      ...defaultMenuSettings,
      productTemplate: normalizeProductTemplate(oldTpl),
    };
  }
  return null;
}

function sanitizeSettings(input: MenuSettings): MenuSettings {
  return {
    ...input,
    bgColor: sanitizeHexColor(input.bgColor) ?? defaultMenuSettings.bgColor,
    textColor: sanitizeHexColor(input.textColor) ?? defaultMenuSettings.textColor,
    accentColor: sanitizeHexColor(input.accentColor) ?? defaultMenuSettings.accentColor,
    cardColor: input.cardColor ? (sanitizeHexColor(input.cardColor) ?? undefined) : undefined,
    headerBgColor: input.headerBgColor ? (sanitizeHexColor(input.headerBgColor) ?? undefined) : undefined,
    headerTextColor: input.headerTextColor ? (sanitizeHexColor(input.headerTextColor) ?? undefined) : undefined,
    calorieTextColor: input.calorieTextColor ? (sanitizeHexColor(input.calorieTextColor) ?? undefined) : undefined,
    bgImage: sanitizeImageUrl(input.bgImage),
    featuredImage: sanitizeImageUrl(input.featuredImage),
    logoImage: sanitizeImageUrl(input.logoImage),
    headerImage: sanitizeImageUrl(input.headerImage),
    featuredTitle: input.featuredTitle?.slice(0, 120),
    featuredSubtitle: input.featuredSubtitle?.slice(0, 200),
    burnBarText: input.burnBarText?.slice(0, 80),
    burnBarTextEn: input.burnBarTextEn?.slice(0, 80),
    showLanguageToggle: input.showLanguageToggle ?? true,
  };
}

/** @deprecated يُستخدم للترحيل فقط — الإعدادات الحالية في venue-store */
export const loadMenuSettings = (): MenuSettings => {
  if (typeof window === "undefined") return defaultMenuSettings;

  let raw = getLocalJson<MenuSettings | null>(STORAGE_KEYS.MENU_SETTINGS, null);
  if (!raw) {
    raw = migrateLegacySettings();
    if (raw) saveMenuSettings(raw);
  }
  if (!raw) return defaultMenuSettings;

  const merged = {
    ...defaultMenuSettings,
    ...raw,
    productTemplate: normalizeProductTemplate(raw.productTemplate),
  };

  const parsed = menuSettingsSchema.safeParse(merged);
  if (!parsed.success) {
    logger.warn("menu_settings.validation_failed", { issues: parsed.error.issues.length });
    return sanitizeSettings(merged);
  }
  return sanitizeSettings(parsed.data);
};

/** @deprecated — استخدم useMenuSettings / venue-store */
export const saveMenuSettings = (s: MenuSettings) => {
  const safe = sanitizeSettings(s);
  setLocalJson(STORAGE_KEYS.MENU_SETTINGS, safe);
};

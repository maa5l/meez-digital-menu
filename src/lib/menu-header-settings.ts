import type { MenuHeaderCustomization, MenuSettings } from "@/types/domain";

function normalizeImageUrl(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeHeaderCustomization(
  header: MenuHeaderCustomization,
): MenuHeaderCustomization {
  return {
    ...header,
    featuredImage: normalizeImageUrl(header.featuredImage),
    headerImage: normalizeImageUrl(header.headerImage),
    logoImage: normalizeImageUrl(header.logoImage),
  };
}

/** إعدادات هيدر منيو المنتجات (حقول مسطّحة للتوافق) */
export function getProductsHeaderCustomization(settings: MenuSettings): MenuHeaderCustomization {
  return normalizeHeaderCustomization({
    featuredTitle: settings.featuredTitle,
    featuredSubtitle: settings.featuredSubtitle,
    featuredImage: settings.featuredImage,
    headerImage: settings.headerImage,
    headerBgColor: settings.headerBgColor,
    headerTextColor: settings.headerTextColor,
    logoImage: settings.logoImage,
    calorieTextColor: settings.calorieTextColor,
    showLanguageToggle: settings.showLanguageToggle,
    autoHideHeaderOnScroll: settings.autoHideHeaderOnScroll,
    hideHeader: settings.hideHeader,
  });
}

/** إعدادات هيدر منيو المحاصيل */
export function getCropsHeaderCustomization(settings: MenuSettings): MenuHeaderCustomization {
  return normalizeHeaderCustomization(settings.cropsHeader ?? {});
}

export function patchProductsHeader(
  settings: MenuSettings,
  patch: Partial<MenuHeaderCustomization>,
): MenuSettings {
  return { ...settings, ...patch };
}

export function patchCropsHeader(
  settings: MenuSettings,
  patch: Partial<MenuHeaderCustomization>,
): MenuSettings {
  return {
    ...settings,
    cropsHeader: { ...getCropsHeaderCustomization(settings), ...patch },
  };
}

export function isProductsLangToggleEnabled(settings: MenuSettings): boolean {
  return getProductsHeaderCustomization(settings).showLanguageToggle !== false;
}

export function isCropsLangToggleEnabled(settings: MenuSettings): boolean {
  return getCropsHeaderCustomization(settings).showLanguageToggle !== false;
}

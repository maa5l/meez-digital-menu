import type { MenuSettings } from "@/types/domain";

/** ارتفاع ثابت للهيدر الكامل (إفصاح السعرات + شعار + عنوان) */
export const MENU_PRODUCT_HEADER_HEIGHT = 136;

/** ارتفاع شريط التصنيفات + اللغة */
export const MENU_SUBHEADER_HEIGHT = 48;

export function getMenuProductHeaderHeight(_settings?: MenuSettings): number {
  return MENU_PRODUCT_HEADER_HEIGHT;
}

export function getMenuTopChromeHeight(hasSubheader: boolean): number {
  return MENU_PRODUCT_HEADER_HEIGHT + (hasSubheader ? MENU_SUBHEADER_HEIGHT : 0);
}

export const headerHideTransition =
  "transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform";

export function getCalorieDisclaimerColor(settings: MenuSettings, fallback: string): string {
  return settings.calorieTextColor ?? fallback;
}

import type { MenuHeaderCustomization } from "@/types/domain";

/** ارتفاع ثابت للهيدر الكامل (إفصاح السعرات + شعار + عنوان) */
export const MENU_PRODUCT_HEADER_HEIGHT = 288;

/** ارتفاع شريط التصنيفات + اللغة */
export const MENU_SUBHEADER_HEIGHT = 48;

/** ارتفاع صف إفصاح السعرات في الوضع المدمج */
export const MENU_CALORIE_ROW_HEIGHT = 40;

/** ارتفاع صف الشعار في الوضع المدمج */
export const MENU_LOGO_ROW_HEIGHT = 44;

/** ارتفاع الشريط العلوي عند إخفاء الهيدر (سعرات + شعار) */
export const MENU_COMPACT_TOP_HEIGHT = MENU_CALORIE_ROW_HEIGHT + MENU_LOGO_ROW_HEIGHT;

/** @deprecated استخدم MENU_COMPACT_TOP_HEIGHT */
export const MENU_CALORIE_BAR_HEIGHT = MENU_COMPACT_TOP_HEIGHT;

export function getMenuProductHeaderHeight(_settings?: unknown): number {
  return MENU_PRODUCT_HEADER_HEIGHT;
}

export function getMenuTopChromeHeight(hasSubheader: boolean): number {
  return MENU_PRODUCT_HEADER_HEIGHT + (hasSubheader ? MENU_SUBHEADER_HEIGHT : 0);
}

/** مساحة أعلى منطقة التمرير — تتقلص عند إخفاء الهيدر مع الإبقاء على شريط التصنيفات */
export function getMenuScrollPaddingTop(
  hasSubheader: boolean,
  headerVisible: boolean,
  hideHeader = false,
): number {
  if (hideHeader) {
    return MENU_COMPACT_TOP_HEIGHT + (hasSubheader ? MENU_SUBHEADER_HEIGHT : 0);
  }
  if (headerVisible) return getMenuTopChromeHeight(hasSubheader);
  return hasSubheader ? MENU_SUBHEADER_HEIGHT : 0;
}

/** موضع شريط التصنيفات الثابت تحت الهيدر أو أعلى الشاشة عند إخفائه */
export function getMenuSubheaderTop(headerVisible: boolean, hideHeader = false): number {
  if (hideHeader) return MENU_COMPACT_TOP_HEIGHT;
  return headerVisible ? MENU_PRODUCT_HEADER_HEIGHT : 0;
}

export const headerHideTransition =
  "transition-[transform,opacity,padding-top,top] duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[transform,padding-top]";

export function getCalorieDisclaimerColor(
  header: Pick<MenuHeaderCustomization, "calorieTextColor">,
  fallback: string,
): string {
  return header.calorieTextColor ?? fallback;
}

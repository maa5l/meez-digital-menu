import type { MenuHeaderCustomization } from "@/types/domain";
import {
  DEFAULT_MENU_LAYOUT_METRICS,
  getMenuLayoutMetrics,
  type MenuLayoutMetrics,
} from "@/lib/menu-layout-metrics";

/** @deprecated استخدم getMenuLayoutMetrics — قيمة افتراضية للآيباد أفقي */
export const MENU_PRODUCT_HEADER_HEIGHT = DEFAULT_MENU_LAYOUT_METRICS.headerHeight;

/** @deprecated استخدم getMenuLayoutMetrics */
export const MENU_SUBHEADER_HEIGHT = DEFAULT_MENU_LAYOUT_METRICS.subheaderHeight;

/** @deprecated استخدم getMenuLayoutMetrics */
export const MENU_CALORIE_ROW_HEIGHT = DEFAULT_MENU_LAYOUT_METRICS.calorieRowHeight;

/** @deprecated استخدم getMenuLayoutMetrics */
export const MENU_LOGO_SIZE_PX = DEFAULT_MENU_LAYOUT_METRICS.logoSizePx;

/** @deprecated استخدم getMenuLayoutMetrics */
export const MENU_LOGO_ROW_HEIGHT = DEFAULT_MENU_LAYOUT_METRICS.logoSizePx;

/** @deprecated استخدم getMenuLayoutMetrics */
export const MENU_COMPACT_TOP_HEIGHT = DEFAULT_MENU_LAYOUT_METRICS.compactTopHeight;

/** @deprecated استخدم MENU_COMPACT_TOP_HEIGHT */
export const MENU_CALORIE_BAR_HEIGHT = DEFAULT_MENU_LAYOUT_METRICS.compactTopHeight;

export function getMenuProductHeaderHeight(viewportWidth?: number): number {
  const m = viewportWidth != null ? getMenuLayoutMetrics(viewportWidth) : DEFAULT_MENU_LAYOUT_METRICS;
  return m.headerHeight;
}

export function getMenuTopChromeHeight(
  hasSubheader: boolean,
  metrics: MenuLayoutMetrics = DEFAULT_MENU_LAYOUT_METRICS,
): number {
  return metrics.headerHeight + (hasSubheader ? metrics.subheaderHeight : 0);
}

/** ارتفاع الشريط العلوي عند إخفاء الهيدر — صفر أو شريط اللغة فقط */
export function getHiddenHeaderTopHeight(
  showLangInCompactBar: boolean,
  metrics: MenuLayoutMetrics = DEFAULT_MENU_LAYOUT_METRICS,
): number {
  return showLangInCompactBar ? metrics.langBarHeight : 0;
}

/** مساحة أعلى منطقة التمرير — تتقلص عند إخفاء الهيدر مع الإبقاء على شريط التصنيفات */
export function getMenuScrollPaddingTop(
  hasSubheader: boolean,
  headerVisible: boolean,
  hideHeader = false,
  metrics: MenuLayoutMetrics = DEFAULT_MENU_LAYOUT_METRICS,
  showLangInCompactBar = false,
): number {
  if (hideHeader) {
    return getHiddenHeaderTopHeight(showLangInCompactBar, metrics) + (hasSubheader ? metrics.subheaderHeight : 0);
  }
  if (headerVisible) return getMenuTopChromeHeight(hasSubheader, metrics);
  return hasSubheader ? metrics.subheaderHeight : 0;
}

/** موضع شريط التصنيفات الثابت تحت الهيدر أو أعلى الشاشة عند إخفائه */
export function getMenuSubheaderTop(
  headerVisible: boolean,
  hideHeader = false,
  metrics: MenuLayoutMetrics = DEFAULT_MENU_LAYOUT_METRICS,
  showLangInCompactBar = false,
): number {
  if (hideHeader) return getHiddenHeaderTopHeight(showLangInCompactBar, metrics);
  return headerVisible ? metrics.headerHeight : 0;
}

export const headerHideTransition =
  "transition-[transform,opacity,padding-top,top] duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[transform,padding-top]";

/** حركة خفيفة لعناصر الهيدر عند تبديل اللغة أو الظهور */
export const menuChromeMotion =
  "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none";

/** دخول محتوى المنيو (منتجات، تصنيفات، …) */
export const menuContentEnter =
  "animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both motion-reduce:animate-none";

/** محاذاة إفصاح السعرات */
export function menuCalorieAlignClass(lang: "ar" | "en"): string {
  return lang === "ar" ? "items-start" : "items-end";
}

/** محاذاة الشعار — عكس إفصاح السعرات */
export function menuLogoJustifyClass(lang: "ar" | "en"): string {
  return lang === "ar" ? "justify-end" : "justify-start";
}

export function getCalorieDisclaimerColor(
  header: Pick<MenuHeaderCustomization, "calorieTextColor">,
  fallback: string,
): string {
  return header.calorieTextColor ?? fallback;
}

/** ارتفاع منطقة محتوى المنيو — يملأ الشاشة تحت الهيدر (آيباد) */
export function getMenuPanelContentHeight(
  scrollPaddingTop: number,
  bottomInset = 12,
): string {
  return `calc(100dvh - ${scrollPaddingTop + bottomInset}px)`;
}

/** @deprecated استخدم getMenuPanelContentHeight */
export const getMenuCropsContentHeight = getMenuPanelContentHeight;

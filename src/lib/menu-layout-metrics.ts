import { HEADER_IMAGE_SPEC } from "@/lib/header-image-spec";

/** مقاسات تخطيط المنيو حسب عرض الشاشة — مُحسَّنة للآيباد */
export type MenuViewportTier = "compact" | "ipad-portrait" | "ipad-landscape";

export type MenuLayoutMetrics = {
  tier: MenuViewportTier;
  headerHeight: number;
  subheaderHeight: number;
  logoSizePx: number;
  calorieRowHeight: number;
  compactTopHeight: number;
};

/** ارتفاع بانر الهيدر على العرض — نفس نسبة العرض في header-image-spec */
const HEADER_DISPLAY_RATIO =
  HEADER_IMAGE_SPEC.displayHeight / HEADER_IMAGE_SPEC.displayWidth;

const METRICS_BY_TIER: Record<MenuViewportTier, Omit<MenuLayoutMetrics, "tier">> = {
  compact: {
    headerHeight: 156,
    subheaderHeight: 40,
    logoSizePx: 52,
    calorieRowHeight: 40,
    compactTopHeight: 72,
  },
  "ipad-portrait": {
    headerHeight: 172,
    subheaderHeight: 44,
    logoSizePx: 56,
    calorieRowHeight: 44,
    compactTopHeight: 80,
  },
  "ipad-landscape": {
    headerHeight: 188,
    subheaderHeight: 46,
    logoSizePx: 56,
    calorieRowHeight: 44,
    compactTopHeight: 80,
  },
};

export const MENU_LAYOUT_BREAKPOINTS = {
  ipadPortrait: 768,
  ipadLandscape: 1024,
} as const;

export function getMenuViewportTier(viewportWidth: number): MenuViewportTier {
  if (viewportWidth >= MENU_LAYOUT_BREAKPOINTS.ipadLandscape) return "ipad-landscape";
  if (viewportWidth >= MENU_LAYOUT_BREAKPOINTS.ipadPortrait) return "ipad-portrait";
  return "compact";
}

/** ارتفاع الهيدر المتناسب مع عرض الشاشة (بانر 1024×240 على الآيباد أفقي) */
export function getBannerHeaderHeight(viewportWidth: number): number {
  return Math.round(viewportWidth * HEADER_DISPLAY_RATIO);
}

function resolveHeaderHeight(viewportWidth: number, tier: MenuViewportTier): number {
  const proportional = getBannerHeaderHeight(viewportWidth);
  const floor = METRICS_BY_TIER[tier].headerHeight;
  if (tier === "compact") {
    return Math.max(floor, Math.min(proportional, 180));
  }
  return Math.max(floor, proportional);
}

export function getMenuLayoutMetrics(viewportWidth: number): MenuLayoutMetrics {
  const tier = getMenuViewportTier(viewportWidth);
  const base = METRICS_BY_TIER[tier];
  return {
    tier,
    ...base,
    headerHeight: resolveHeaderHeight(viewportWidth, tier),
  };
}

/** قيم افتراضية للآيباد أفقي — للاستيراد الثابت حيث لا يتوفر عرض الشاشة */
export const DEFAULT_MENU_LAYOUT_METRICS = getMenuLayoutMetrics(
  MENU_LAYOUT_BREAKPOINTS.ipadLandscape,
);

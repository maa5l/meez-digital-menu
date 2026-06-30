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

const METRICS_BY_TIER: Record<MenuViewportTier, Omit<MenuLayoutMetrics, "tier">> = {
  compact: {
    headerHeight: 200,
    subheaderHeight: 40,
    logoSizePx: 64,
    calorieRowHeight: 46,
    compactTopHeight: 84,
  },
  "ipad-portrait": {
    headerHeight: 220,
    subheaderHeight: 42,
    logoSizePx: 72,
    calorieRowHeight: 48,
    compactTopHeight: 92,
  },
  "ipad-landscape": {
    headerHeight: 240,
    subheaderHeight: 44,
    logoSizePx: 72,
    calorieRowHeight: 48,
    compactTopHeight: 92,
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

export function getMenuLayoutMetrics(viewportWidth: number): MenuLayoutMetrics {
  const tier = getMenuViewportTier(viewportWidth);
  return { tier, ...METRICS_BY_TIER[tier] };
}

/** قيم افتراضية للآيباد أفقي — للاستيراد الثابت حيث لا يتوفر عرض الشاشة */
export const DEFAULT_MENU_LAYOUT_METRICS = getMenuLayoutMetrics(
  MENU_LAYOUT_BREAKPOINTS.ipadLandscape,
);

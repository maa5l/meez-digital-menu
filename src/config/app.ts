export const APP_NAME = "ميز";
export const APP_NAME_EN = "Meez";

export const ROUTES = {
  home: "/",
  auth: "/auth",
  display: "/display",
  pair: "/pair",
  menu: "/menu",
  dashboard: "/dashboard",
  dashboardCategories: "/dashboard/categories",
  dashboardProducts: "/dashboard/products",
  dashboardCrops: "/dashboard/crops",
  dashboardDevices: "/dashboard/devices",
  dashboardLinkDevice: "/dashboard/link-device",
  dashboardTheme: "/dashboard/theme",
  dashboardSubscription: "/dashboard/subscription",
  dashboardPayment: "/dashboard/subscription/pay",
  dashboardSettings: "/dashboard/settings",
} as const;

/** أنماط مسموحة للألوان في إعدادات المنيو */
export const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

/** رمز تفعيل الجهاز (تنسيق QM-XXXX) */
export const DEVICE_CODE_PATTERN = /^QM-[A-HJ-NP-Z2-9]{4}$/;

/** رمز PIN للتابلت (4 أرقام) */
export const DEVICE_PIN_PATTERN = /^\d{4}$/;

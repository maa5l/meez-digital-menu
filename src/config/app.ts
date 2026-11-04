export const APP_NAME = "Meez";
export const APP_NAME_EN = "Meez";

export const ROUTES = {
  home: "/",
  auth: "/login",
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
  dashboardSettings: "/dashboard/settings",
  subscriptionExpired: "/subscription-expired",
  admin: "/admin",
  adminCustomers: "/admin/customers",
  adminCustomer: "/admin/customers/:id",
} as const;

/** أنماط مسموحة للألوان في إعدادات المنيو */
export const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

/** رمز تفعيل الجهاز (تنسيق QM-XXXX) */
export const DEVICE_CODE_PATTERN = /^QM-[A-HJ-NP-Z2-9]{4}$/;

/** الأحرف المسموحة في لاحقة الرمز (بدون QM-) */
export const DEVICE_CODE_SUFFIX_PATTERN = /^[A-HJ-NP-Z2-9]{4}$/;

/** رمز PIN للتابلت (4 أرقام) */
export const DEVICE_PIN_PATTERN = /^\d{4}$/;

/**
 * يحوّل إدخال المستخدم إلى QM-XXXX.
 * يقبل: A1B2 أو QMA1B2 أو QM-A1B2 (مع تجاهل مسافات/رموز زائدة).
 */
export function normalizeDeviceActivationCode(raw: string): string {
  let s = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (s.startsWith("QM-")) s = s.slice(3);
  else if (s.startsWith("QM")) s = s.slice(2);
  s = s.replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 4);
  return s ? `QM-${s}` : "";
}

/** اللاحقة فقط للواجهة (بدون QM-) */
export function deviceActivationCodeSuffix(raw: string): string {
  const full = normalizeDeviceActivationCode(raw);
  return full.startsWith("QM-") ? full.slice(3) : "";
}

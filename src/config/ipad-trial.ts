/** نسخة تجريبية لتطبيق الآيباد — عطّلها بـ VITE_IPAD_TRIAL_MODE=false بعد اعتماد التطبيق */
export const isIpadTrialMode = import.meta.env.VITE_IPAD_TRIAL_MODE !== "false";

const DEFAULT_SITE_LABEL = "meez-digital-menu.vercel.app";

/** نص رابط الموقع أسفل شاشة الآيباد — لا يستخدم نطاق التطبيق لتجنب فتح المنيو بالخطأ */
export function getPublicSiteLabel(): string {
  const fromEnv = (import.meta.env.VITE_PUBLIC_SITE_HOST as string | undefined)?.trim();
  if (fromEnv) {
    return fromEnv.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
  return DEFAULT_SITE_LABEL;
}

export function getPublicSiteHref(): string {
  const fromEnv = (import.meta.env.VITE_PUBLIC_SITE_HOST as string | undefined)?.trim();
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) return fromEnv.replace(/\/$/, "");
  const label = getPublicSiteLabel();
  return `https://${label}`;
}

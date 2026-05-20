/**
 * إدارة متغيرات البيئة — القيم الحساسة من Vite env فقط.
 * لا تضع أسراراً في الكود المصدري.
 */
const env = import.meta.env;

const supabaseUrl = (env.VITE_SUPABASE_URL as string | undefined) ?? "";
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
const hasSupabaseKeys = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseAnonKey.length >= 20 &&
    !supabaseUrl.includes("YOUR_PROJECT") &&
    !supabaseAnonKey.includes("your_anon_key") &&
    supabaseAnonKey !== "your_publishable_or_anon_key",
);

export const appEnv = {
  mode: env.MODE as "development" | "production" | "test",
  isDev: env.DEV,
  isProd: env.PROD,
  apiBaseUrl: (env.VITE_API_BASE_URL as string | undefined) ?? "",
  appUrl: (env.VITE_APP_URL as string | undefined) ?? "http://localhost:8080",
  /** في التطوير: مفعّل افتراضياً. في الإنتاج: فقط عند VITE_ENABLE_MOCK_AUTH=true */
  enableMockAuth: env.PROD ? env.VITE_ENABLE_MOCK_AUTH === "true" : env.VITE_ENABLE_MOCK_AUTH !== "false",
  /**
   * مصادقة محلية فقط — تُعطَّل تلقائياً عند ضبط مفاتيح Supabase
   * ما لم يُفرض mock صراحةً بـ VITE_USE_LOCAL_MOCK_AUTH=true
   */
  useLocalMockAuth:
    env.VITE_FORCE_SUPABASE_AUTH === "true"
      ? false
      : env.VITE_USE_LOCAL_MOCK_AUTH === "true"
        ? true
        : hasSupabaseKeys
          ? false
          : env.DEV && env.VITE_ENABLE_MOCK_AUTH !== "false",
  hasSupabaseKeys,
  logLevel: (env.VITE_LOG_LEVEL as string | undefined) ?? (env.PROD ? "warn" : "debug"),
  supabaseUrl,
  supabaseAnonKey,
} as const;

/** هل التسجيل/الدخول يمر عبر Supabase Auth؟ */
export function usesSupabaseAuth(): boolean {
  return appEnv.hasSupabaseKeys && !appEnv.useLocalMockAuth;
}

/**
 * أصل التطبيق للروابط والـ QR — في المتصفح يستخدم النطاق الحالي
 * (يصلح QR على Vercel حتى لو VITE_APP_URL = localhost).
 */
export function resolveAppOrigin(): string {
  if (typeof window !== "undefined") {
    const configured = appEnv.appUrl.replace(/\/$/, "");
    const current = window.location.origin;
    const configuredIsLocal = /localhost|127\.0\.0\.1/i.test(configured);
    if (configuredIsLocal) return current;
    if (configured.startsWith("http") && configured !== current) {
      return configured;
    }
    return current;
  }
  return appEnv.appUrl.replace(/\/$/, "");
}

export function requireApiBaseUrl(): string {
  if (!appEnv.apiBaseUrl) {
    throw new Error("VITE_API_BASE_URL is not configured");
  }
  return appEnv.apiBaseUrl;
}

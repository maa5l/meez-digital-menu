/**
 * إدارة متغيرات البيئة — القيم الحساسة من Vite env فقط.
 * لا تضع أسراراً في الكود المصدري.
 */
const env = import.meta.env;

export const appEnv = {
  mode: env.MODE as "development" | "production" | "test",
  isDev: env.DEV,
  isProd: env.PROD,
  apiBaseUrl: (env.VITE_API_BASE_URL as string | undefined) ?? "",
  appUrl: (env.VITE_APP_URL as string | undefined) ?? "http://localhost:8080",
  /** في التطوير: مفعّل افتراضياً. في الإنتاج: فقط عند VITE_ENABLE_MOCK_AUTH=true */
  enableMockAuth: env.PROD ? env.VITE_ENABLE_MOCK_AUTH === "true" : env.VITE_ENABLE_MOCK_AUTH !== "false",
  /** تطوير محلي: مصادقة mock فقط (بدون Supabase Auth) — أسرع وبدون تأكيد بريد */
  useLocalMockAuth:
    env.DEV &&
    env.VITE_ENABLE_MOCK_AUTH !== "false" &&
    env.VITE_FORCE_SUPABASE_AUTH !== "true",
  logLevel: (env.VITE_LOG_LEVEL as string | undefined) ?? (env.PROD ? "warn" : "debug"),
  supabaseUrl: (env.VITE_SUPABASE_URL as string | undefined) ?? "",
  supabaseAnonKey: (env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "",
} as const;

export function requireApiBaseUrl(): string {
  if (!appEnv.apiBaseUrl) {
    throw new Error("VITE_API_BASE_URL is not configured");
  }
  return appEnv.apiBaseUrl;
}

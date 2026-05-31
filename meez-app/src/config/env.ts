const env = import.meta.env;

export const appEnv = {
  supabaseUrl: (env.VITE_SUPABASE_URL as string | undefined) ?? "",
  supabaseAnonKey: (env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "",
  menuWebUrl: ((env.VITE_MENU_WEB_URL as string | undefined) ?? "").replace(/\/$/, ""),
  publicSiteHost: (env.VITE_PUBLIC_SITE_HOST as string | undefined)?.trim(),
} as const;

export function isSupabaseConfigured(): boolean {
  const key = appEnv.supabaseAnonKey;
  const url = appEnv.supabaseUrl;
  return Boolean(
    url &&
      key &&
      key.length >= 20 &&
      !url.includes("YOUR_PROJECT") &&
      !key.includes("your_anon_key") &&
      key !== "your_publishable_or_anon_key",
  );
}

/** عنوان فتح المنيو بعد التفعيل */
export function getMenuWebBaseUrl(): string {
  if (appEnv.menuWebUrl) return appEnv.menuWebUrl;
  if (import.meta.env.DEV) return "http://localhost:8080";
  return getPublicSiteHref();
}

export function getPublicSiteLabel(): string {
  const fromEnv = appEnv.publicSiteHost;
  if (fromEnv) return fromEnv.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return "meez.com";
}

export function getPublicSiteHref(): string {
  const fromEnv = appEnv.publicSiteHost;
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) return fromEnv.replace(/\/$/, "");
  return `https://${getPublicSiteLabel()}`;
}

export function getMenuUrlForCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  const base = getMenuWebBaseUrl().replace(/\/$/, "");
  return `${base}/menu?code=${encodeURIComponent(normalized)}`;
}

/** localhost في VITE_MENU_WEB_URL لا يعمل عبر جهازين مختلفين */
export function isLocalhostMenuUrl(): boolean {
  return /localhost|127\.0\.0\.1/i.test(getMenuWebBaseUrl());
}

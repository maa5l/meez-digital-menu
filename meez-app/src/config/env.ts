const env = {
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_MENU_WEB_URL: process.env.EXPO_PUBLIC_MENU_WEB_URL,
  EXPO_PUBLIC_PUBLIC_SITE_HOST: process.env.EXPO_PUBLIC_PUBLIC_SITE_HOST,
};

export const appEnv = {
  supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  menuWebUrl: (env.EXPO_PUBLIC_MENU_WEB_URL ?? "").replace(/\/$/, ""),
  publicSiteHost: env.EXPO_PUBLIC_PUBLIC_SITE_HOST?.trim(),
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

export function getMenuWebBaseUrl(): string {
  if (appEnv.menuWebUrl) return appEnv.menuWebUrl;
  if (__DEV__) return "http://localhost:8080";
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
  return `${base}/menu?code=${encodeURIComponent(normalized)}&kiosk=1`;
}

export function isLocalhostMenuUrl(): boolean {
  return /localhost|127\.0\.0\.1/i.test(getMenuWebBaseUrl());
}

const env = import.meta.env;

export const appEnv = {
  supabaseUrl: (env.VITE_SUPABASE_URL as string | undefined) ?? "",
  supabaseAnonKey: (env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "",
  menuWebUrl: ((env.VITE_MENU_WEB_URL as string | undefined) ?? "").replace(/\/$/, ""),
  publicSiteHost: (env.VITE_PUBLIC_SITE_HOST as string | undefined)?.trim(),
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(appEnv.supabaseUrl && appEnv.supabaseAnonKey && appEnv.supabaseAnonKey.length >= 20);
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
  const base = appEnv.menuWebUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/menu?code=${encodeURIComponent(code)}`;
}

import { getMenuWebBaseUrl } from "@/config/env";
import { isBlockedMenuHost } from "@/lib/blocked-menu-hosts";

function parseOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/** أصول مسموحة لتحميل المنيو داخل WebView */
export function getTrustedMenuOrigins(): string[] {
  const origins = new Set<string>();
  const base = parseOrigin(getMenuWebBaseUrl());
  if (base) origins.add(base);

  if (__DEV__) {
    origins.add("http://localhost:8080");
    origins.add("http://127.0.0.1:8080");
    origins.add("http://192.168.1.82:8080");
  }

  return [...origins];
}

const BLOCKED_MENU_PATHS = new Set([
  "/",
  "/auth",
  "/pair",
  "/display",
  "/subscription-expired",
  "/dashboard",
  "/admin",
]);

/** مسارات SPA الثابتة — ليست صفحات تسويق */
function isStaticAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith("/assets/") ||
    /\.(js|css|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|map|json|webmanifest)$/i.test(pathname)
  );
}

export function isAllowedMenuNavigation(url: string, trustedOrigins: string[]): boolean {
  if (!url || url === "about:blank") return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (isBlockedMenuHost(parsed.hostname)) return false;
  if (!trustedOrigins.includes(parsed.origin)) return false;

  const path = parsed.pathname.replace(/\/+$/, "") || "/";
  if (path.startsWith("/menu")) return true;
  if (isStaticAssetPath(parsed.pathname)) return true;

  if (BLOCKED_MENU_PATHS.has(path) || path.startsWith("/dashboard") || path.startsWith("/admin")) {
    return false;
  }

  return false;
}

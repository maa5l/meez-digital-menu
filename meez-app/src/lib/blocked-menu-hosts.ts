/** Domain parking / ad networks — must never load inside kiosk WebView */
const BLOCKED_MENU_HOSTS = new Set([
  "router.parklogic.com",
  "parklogic.com",
  "www.parklogic.com",
]);

const PARKING_PAGE_MARKERS = [
  "router.parklogic.com",
  "parklogic",
  "ad-overlay google-ad-bottom-outer",
  "Redirecting...",
] as const;

export function isBlockedMenuHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  if (BLOCKED_MENU_HOSTS.has(host)) return true;
  return host.endsWith(".parklogic.com");
}

export function isBlockedMenuUrl(url: string): boolean {
  try {
    return isBlockedMenuHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function looksLikeParkingPage(html: string): boolean {
  const sample = html.slice(0, 8000).toLowerCase();
  return PARKING_PAGE_MARKERS.some((marker) => sample.includes(marker.toLowerCase()));
}

export function validateMenuWebBaseUrl(url: string): string | null {
  if (!url) return "عنوان المنيو غير مضبوط (EXPO_PUBLIC_MENU_WEB_URL)";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "عنوان المنيو غير صالح";
  }
  if (parsed.protocol !== "https:" && !__DEV__) {
    return "عنوان المنيو يجب أن يستخدم HTTPS في الإنتاج";
  }
  if (isBlockedMenuHost(parsed.hostname)) {
    return `النطاق ${parsed.hostname} محجوز ولا يستضيف المنيو`;
  }
  return null;
}

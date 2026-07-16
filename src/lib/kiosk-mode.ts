/** وضع الكشk — تطبيق WebView على Android/iOS */
export function isKioskMode(searchParams: URLSearchParams): boolean {
  return searchParams.get("kiosk") === "1";
}

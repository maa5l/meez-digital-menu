/**
 * تنظيف المدخلات النصية — منع XSS عند العرض المستقبلي.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"'/]/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

export function sanitizeText(input: unknown, maxLength = 500): string {
  if (input == null) return "";
  const str = String(input).trim().slice(0, maxLength);
  return escapeHtml(str);
}

export function sanitizeHexColor(input: unknown): string | null {
  const str = String(input ?? "").trim();
  if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(str)) {
    return null;
  }
  return str;
}

/** السماح فقط بروابط http(s) أو data:image للخلفيات */
export function sanitizeImageUrl(input: unknown): string | undefined {
  if (input == null || input === "") return undefined;
  const url = String(input).trim();
  if (url.startsWith("data:image/")) {
    if (url.length > 2_000_000) return undefined;
    return url;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
    return parsed.href;
  } catch {
    return undefined;
  }
}

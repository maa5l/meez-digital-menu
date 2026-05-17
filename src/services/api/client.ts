import { appEnv, requireApiBaseUrl } from "@/config/env";
import { AuthError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getSession } from "@/security/session";

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  signal?: AbortSignal;
};

/**
 * عميل API مركزي — جاهز لربط Backend.
 * حالياً يعيد خطأ إذا لم يُضبط VITE_API_BASE_URL.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const baseUrl = appEnv.apiBaseUrl || (appEnv.isDev ? "" : requireApiBaseUrl());

  if (!baseUrl) {
    throw new Error(
      "API غير متصل. اضبط VITE_API_BASE_URL أو فعّل الوضع التجريبي عبر VITE_ENABLE_MOCK_AUTH.",
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  if (options.auth) {
    const session = getSession();
    if (!session) throw new AuthError();
    // عند ربط Backend: headers.Authorization = `Bearer ${accessToken}`;
  }

  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const started = performance.now();

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body != null ? JSON.stringify(options.body) : undefined,
    credentials: "include",
    signal: options.signal,
  });

  logger.debug("api.request", {
    method: options.method ?? "GET",
    path,
    status: response.status,
    durationMs: Math.round(performance.now() - started),
  });

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    try {
      const json = JSON.parse(text) as { detail?: string | { msg?: string }[] };
      if (typeof json.detail === "string") {
        if (json.detail === "Not Found") {
          throw new Error(
            "المسار غير موجود على الخادم. تأكد من VITE_API_BASE_URL=http://localhost:8000/api/v1",
          );
        }
        throw new Error(json.detail);
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("VITE_API")) throw e;
    }
    throw new Error(text || `خطأ من الخادم (${response.status})`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

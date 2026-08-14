import { logger } from "@/lib/logger";

export type RateLimitScope = {
  /** مفتاح العملية — endpoint + scope (مثل kiosk:peek:QM-XXXX) */
  key: string;
  endpoint: string;
  method?: string;
};

type ScopeState = {
  blockedUntil: number;
  retryAfterSeconds: number;
  attempt: number;
  lastLoggedAt: number;
};

const scopeStates = new Map<string, ScopeState>();

/** أقصى انتظار بين محاولات مجدولة (لا يُلغي Retry-After للحظر الفعلي) */
export const MAX_SCHEDULED_RETRY_MS = 60_000;
export const MAX_RETRY_ATTEMPTS = 8;

export function parseRetryAfterSeconds(value: unknown, fallbackSeconds = 30): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.ceil(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallbackSeconds;
}

export function shouldSkipRateLimitedRequest(scopeKey: string): boolean {
  const state = scopeStates.get(scopeKey);
  if (!state) return false;
  return Date.now() < state.blockedUntil;
}

export function getRateLimitRemainingMs(scopeKey: string): number {
  const state = scopeStates.get(scopeKey);
  if (!state) return 0;
  return Math.max(0, state.blockedUntil - Date.now());
}

export function getRateLimitAttempt(scopeKey: string): number {
  return scopeStates.get(scopeKey)?.attempt ?? 0;
}

export function recordRateLimitHit(
  scope: RateLimitScope,
  retryAfterSeconds: number,
  meta: Record<string, unknown> = {},
): { blockedUntil: number; attempt: number; scheduledRetryMs: number } {
  const prev = scopeStates.get(scope.key);
  const attempt = Math.min((prev?.attempt ?? 0) + 1, MAX_RETRY_ATTEMPTS);
  const retrySec = parseRetryAfterSeconds(retryAfterSeconds);
  const jitterMs = Math.floor(Math.random() * 1_500);
  const blockedUntil = Date.now() + retrySec * 1_000 + jitterMs;
  const scheduledRetryMs = computeScheduledRetryMs(retrySec, attempt);

  scopeStates.set(scope.key, {
    blockedUntil,
    retryAfterSeconds: retrySec,
    attempt,
    lastLoggedAt: Date.now(),
  });

  const shouldLog = !prev || Date.now() - prev.lastLoggedAt > 5_000;
  if (shouldLog) {
    logger.warn("rate_limit.hit", {
      endpoint: scope.endpoint,
      method: scope.method ?? "RPC",
      scopeKey: scope.key,
      statusCode: 429,
      retryAfterSeconds: retrySec,
      attempt,
      scheduledRetryMs,
      source: "supabase_kiosk_rate_limit",
      ...meta,
    });
  }

  return { blockedUntil, attempt, scheduledRetryMs };
}

export function recordRateLimitSuccess(scopeKey: string): void {
  scopeStates.delete(scopeKey);
}

/** Exponential backoff + jitter — capped for scheduling UI/poll ticks */
export function computeScheduledRetryMs(retryAfterSeconds: number, attempt: number): number {
  const respectMs = retryAfterSeconds * 1_000;
  const expMs = Math.min(15_000 * 2 ** Math.max(0, attempt - 1), MAX_SCHEDULED_RETRY_MS);
  const jitterMs = Math.floor(Math.random() * 2_000);
  return Math.min(respectMs, expMs + jitterMs);
}

export function hasExceededRetryAttempts(scopeKey: string): boolean {
  return getRateLimitAttempt(scopeKey) >= MAX_RETRY_ATTEMPTS;
}

export function resetRateLimitScope(scopeKey: string): void {
  scopeStates.delete(scopeKey);
}

export function resetAllRateLimitScopes(): void {
  scopeStates.clear();
}

/** للاختبارات */
export function __getRateLimitScopeState(scopeKey: string): ScopeState | undefined {
  return scopeStates.get(scopeKey);
}

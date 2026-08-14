import { describe, expect, it, beforeEach } from "vitest";
import {
  computeScheduledRetryMs,
  getRateLimitAttempt,
  hasExceededRetryAttempts,
  MAX_RETRY_ATTEMPTS,
  parseRetryAfterSeconds,
  recordRateLimitHit,
  recordRateLimitSuccess,
  resetAllRateLimitScopes,
  shouldSkipRateLimitedRequest,
  __getRateLimitScopeState,
} from "@/lib/rate-limit-coordinator";

describe("rate-limit-coordinator", () => {
  beforeEach(() => {
    resetAllRateLimitScopes();
  });

  it("parses Retry-After numeric values", () => {
    expect(parseRetryAfterSeconds(212)).toBe(212);
    expect(parseRetryAfterSeconds("45")).toBe(45);
    expect(parseRetryAfterSeconds(undefined, 30)).toBe(30);
  });

  it("blocks only the affected scope — not other scopes", () => {
    recordRateLimitHit(
      { key: "kiosk:peek:QM-AAAA", endpoint: "get_kiosk_state" },
      120,
    );
    expect(shouldSkipRateLimitedRequest("kiosk:peek:QM-AAAA")).toBe(true);
    expect(shouldSkipRateLimitedRequest("kiosk:peek:QM-BBBB")).toBe(false);
  });

  it("clears block after success on the same scope", () => {
    const scopeKey = "kiosk:peek:QM-CCCC";
    recordRateLimitHit({ key: scopeKey, endpoint: "get_kiosk_state" }, 60);
    expect(shouldSkipRateLimitedRequest(scopeKey)).toBe(true);
    recordRateLimitSuccess(scopeKey);
    expect(shouldSkipRateLimitedRequest(scopeKey)).toBe(false);
  });

  it("increments attempts and respects max retry attempts", () => {
    const scopeKey = "kiosk:state:QM-DDDD";
    for (let i = 0; i < MAX_RETRY_ATTEMPTS; i++) {
      recordRateLimitHit({ key: scopeKey, endpoint: "get_kiosk_state" }, 10);
    }
    expect(getRateLimitAttempt(scopeKey)).toBe(MAX_RETRY_ATTEMPTS);
    expect(hasExceededRetryAttempts(scopeKey)).toBe(true);
  });

  it("schedules capped retry delay with exponential backoff", () => {
    const first = computeScheduledRetryMs(212, 1);
    const second = computeScheduledRetryMs(212, 2);
    expect(first).toBeLessThanOrEqual(60_000);
    expect(second).toBeLessThanOrEqual(60_000);
    expect(second).toBeGreaterThanOrEqual(first - 2_000);
  });

  it("stores retry-after on scope state", () => {
    const scopeKey = "kiosk:access:QM-EEEE";
    recordRateLimitHit({ key: scopeKey, endpoint: "check_kiosk_access" }, 212);
    expect(__getRateLimitScopeState(scopeKey)?.retryAfterSeconds).toBe(212);
  });
});

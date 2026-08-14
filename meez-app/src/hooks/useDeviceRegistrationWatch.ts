import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { isSupabaseConfigured } from "@/config/env";
import { computeScheduledRetryMs } from "@/lib/rate-limit-coordinator";
import {
  peekDeviceRegistration,
  type RegistrationPeek,
} from "@/services/kiosk-check";

const POLL_MS = 30_000;
const MIN_FORCE_GAP_MS = 15_000;

type Options = {
  enabled?: boolean;
  mode?: "await_activation" | "monitor_active";
  onStatus?: (peek: RegistrationPeek) => void;
  onRegistered?: (code: string) => void;
  onUnregistered?: (code: string) => void;
};

/** polling خفيف — rate limit على get_kiosk_state فقط */
export function useDeviceRegistrationWatch(code: string | null, options?: Options) {
  const enabled = options?.enabled !== false;
  const mode = options?.mode ?? "await_activation";
  const onRegisteredRef = useRef(options?.onRegistered);
  onRegisteredRef.current = options?.onRegistered;
  const onUnregisteredRef = useRef(options?.onUnregistered);
  onUnregisteredRef.current = options?.onUnregistered;
  const onStatusRef = useRef(options?.onStatus);
  onStatusRef.current = options?.onStatus;
  const activatedRef = useRef(false);

  useEffect(() => {
    if (!code || !enabled) return;

    let cancelled = false;
    activatedRef.current = false;
    let pollId: ReturnType<typeof setInterval> | undefined;
    let retryId: ReturnType<typeof setTimeout> | undefined;
    let lastForceAt = 0;

    const stopTimers = () => {
      if (pollId != null) clearInterval(pollId);
      pollId = undefined;
      if (retryId != null) clearTimeout(retryId);
      retryId = undefined;
    };

    const scheduleRetry = (retryAfterSeconds?: number) => {
      if (retryId != null) clearTimeout(retryId);
      retryId = setTimeout(() => {
        if (!cancelled) void check(true);
      }, computeScheduledRetryMs(retryAfterSeconds ?? 30, 1));
    };

    const check = async (force: boolean) => {
      if (cancelled) return;
      if (mode === "await_activation" && activatedRef.current) return;

      const next = await peekDeviceRegistration(code, force);
      if (cancelled) return;

      onStatusRef.current?.(next);

      if (next.rateLimited || next.reason === "rate_limited") {
        scheduleRetry(next.retry_after_seconds);
        if (mode === "monitor_active" && next.status === "registered") {
          return;
        }
        return;
      }

      if (mode === "await_activation") {
        if (next.status === "registered") {
          activatedRef.current = true;
          stopTimers();
          onRegisteredRef.current?.(code);
          return;
        }
      } else if (next.status !== "registered") {
        onUnregisteredRef.current?.(code);
        return;
      }
    };

    void check(true);

    if (isSupabaseConfigured()) {
      pollId = setInterval(() => void check(false), POLL_MS);
    }

    const onAppState = (state: AppStateStatus) => {
      if (state !== "active" || cancelled) return;
      if (mode === "await_activation" && activatedRef.current) return;
      if (Date.now() - lastForceAt < MIN_FORCE_GAP_MS) return;
      lastForceAt = Date.now();
      void check(true);
    };

    const sub = AppState.addEventListener("change", onAppState);

    return () => {
      cancelled = true;
      stopTimers();
      sub.remove();
    };
  }, [code, enabled, mode]);
}

import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { isSupabaseConfigured } from "@/config/env";
import {
  peekDeviceRegistration,
  type RegistrationPeek,
} from "@/services/kiosk-check";

const POLL_MS = 12_000;
const MIN_BACKOFF_MS = 15_000;

type Options = {
  enabled?: boolean;
  /** await_activation: انتظر التفعيل ثم توقف. monitor_active: راقب إلغاء التفعيل أثناء عرض المنيو */
  mode?: "await_activation" | "monitor_active";
  onStatus?: (peek: RegistrationPeek) => void;
  onRegistered?: (code: string) => void;
  onUnregistered?: (code: string) => void;
};

/** polling خفيف — مع تراجع عند rate limit */
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
    let backoffId: ReturnType<typeof setTimeout> | undefined;

    const stopPolling = () => {
      if (pollId != null) clearInterval(pollId);
      pollId = undefined;
      if (backoffId != null) clearTimeout(backoffId);
      backoffId = undefined;
    };

    const schedulePoll = (delayMs: number) => {
      stopPolling();
      backoffId = setTimeout(() => {
        if (!cancelled) {
          pollId = setInterval(() => void check(false), POLL_MS);
        }
      }, delayMs);
    };

    const check = async (force: boolean) => {
      if (cancelled) return;
      if (mode === "await_activation" && activatedRef.current) return;

      const next = await peekDeviceRegistration(code, force);
      if (cancelled) return;

      onStatusRef.current?.(next);

      if (mode === "await_activation") {
        if (next.status === "registered") {
          activatedRef.current = true;
          stopPolling();
          onRegisteredRef.current?.(code);
          return;
        }
      } else {
        // monitor_active: أي حالة غير مسجّل/مسموح → العودة لشاشة الرمز
        if (next.status !== "registered") {
          if (next.reason === "rate_limited") {
            const waitSec = next.retry_after_seconds ?? 60;
            schedulePoll(Math.max(MIN_BACKOFF_MS, waitSec * 1000));
            return;
          }
          onUnregisteredRef.current?.(code);
          return;
        }
      }

      if (next.reason === "rate_limited") {
        const waitSec = next.retry_after_seconds ?? 60;
        const waitMs = Math.max(MIN_BACKOFF_MS, waitSec * 1000);
        schedulePoll(waitMs);
      }
    };

    void check(true);

    if (isSupabaseConfigured()) {
      pollId = setInterval(() => void check(false), POLL_MS);
    }

    const onAppState = (state: AppStateStatus) => {
      if (state === "active" && !cancelled) {
        if (mode === "await_activation" && activatedRef.current) return;
        void check(true);
      }
    };

    const sub = AppState.addEventListener("change", onAppState);

    return () => {
      cancelled = true;
      stopPolling();
      sub.remove();
    };
  }, [code, enabled, mode]);
}

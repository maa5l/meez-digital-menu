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
  onStatus?: (peek: RegistrationPeek) => void;
  onRegistered?: (code: string) => void;
};

/** polling خفيف — مع تراجع عند rate limit */
export function useDeviceRegistrationWatch(code: string | null, options?: Options) {
  const enabled = options?.enabled !== false;
  const onRegisteredRef = useRef(options?.onRegistered);
  onRegisteredRef.current = options?.onRegistered;
  const onStatusRef = useRef(options?.onStatus);
  onStatusRef.current = options?.onStatus;
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!code || !enabled) return;

    let cancelled = false;
    registeredRef.current = false;
    let pollId: ReturnType<typeof setInterval> | undefined;
    let backoffId: ReturnType<typeof setTimeout> | undefined;

    const schedulePoll = (delayMs: number) => {
      if (pollId != null) clearInterval(pollId);
      pollId = undefined;
      if (backoffId != null) clearTimeout(backoffId);
      backoffId = setTimeout(() => {
        if (!cancelled && !registeredRef.current) {
          pollId = setInterval(() => void check(false), POLL_MS);
        }
      }, delayMs);
    };

    const check = async (force: boolean) => {
      if (cancelled || registeredRef.current) return;

      const next = await peekDeviceRegistration(code, force);
      if (cancelled || registeredRef.current) return;

      onStatusRef.current?.(next);

      if (next.status === "registered") {
        registeredRef.current = true;
        if (pollId != null) clearInterval(pollId);
        if (backoffId != null) clearTimeout(backoffId);
        onRegisteredRef.current?.(code);
        return;
      }

      if (next.reason === "rate_limited") {
        const waitSec = next.retry_after_seconds ?? 60;
        const waitMs = Math.max(MIN_BACKOFF_MS, waitSec * 1000);
        if (pollId != null) clearInterval(pollId);
        pollId = undefined;
        schedulePoll(waitMs);
      }
    };

    void check(true);

    if (isSupabaseConfigured()) {
      pollId = setInterval(() => void check(false), POLL_MS);
    }

    const onAppState = (state: AppStateStatus) => {
      if (state === "active" && !cancelled && !registeredRef.current) {
        void check(true);
      }
    };

    const sub = AppState.addEventListener("change", onAppState);

    return () => {
      cancelled = true;
      if (pollId != null) clearInterval(pollId);
      if (backoffId != null) clearTimeout(backoffId);
      sub.remove();
    };
  }, [code, enabled]);
}

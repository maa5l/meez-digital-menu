import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { checkDeviceRegisteredOnServer } from "@/services/kiosk-check";

const POLL_STEPS_MS = [8_000, 12_000, 20_000, 30_000, 45_000] as const;
const HIDDEN_POLL_MS = 90_000;

type Options = {
  enabled?: boolean;
  onRegistered?: (code: string) => void;
};

/**
 * مراقبة صامتة — لا تحدّث واجهة React (لا وميض ولا نصوص حالة).
 */
export function useDeviceRegistrationWatch(code: string | null, options?: Options) {
  const enabled = options?.enabled !== false;
  const onRegisteredRef = useRef(options?.onRegistered);
  onRegisteredRef.current = options?.onRegistered;
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!code || !enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const delay = () => {
      if (document.hidden) return HIDDEN_POLL_MS;
      const step = Math.min(attemptRef.current, POLL_STEPS_MS.length - 1);
      return POLL_STEPS_MS[step];
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void tick(), delay());
    };

    const tick = async () => {
      if (cancelled) return;
      if (document.hidden) {
        schedule();
        return;
      }

      const next = await checkDeviceRegisteredOnServer(code);
      if (cancelled) return;

      if (next === "registered") {
        onRegisteredRef.current?.(code);
        return;
      }

      attemptRef.current += 1;
      schedule();
    };

    attemptRef.current = 0;
    void tick();

    const onVisible = () => {
      if (document.hidden || cancelled) return;
      attemptRef.current = 0;
      clearTimeout(timer);
      void tick();
    };

    document.addEventListener("visibilitychange", onVisible);

    let removeCapListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      void CapApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive && !cancelled) onVisible();
      }).then((h) => {
        removeCapListener = () => void h.remove();
      });
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      removeCapListener?.();
    };
  }, [code, enabled]);
}

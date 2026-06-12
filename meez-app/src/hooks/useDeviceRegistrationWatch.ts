import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { isSupabaseConfigured } from "@/config/env";
import { checkDeviceRegisteredOnServer } from "@/services/kiosk-check";

const REGISTRATION_POLL_MS = 30_000;

type Options = {
  enabled?: boolean;
  onRegistered?: (code: string) => void;
};

/** polling + فحص عند الفتح/العودة (RPC-only) */
export function useDeviceRegistrationWatch(code: string | null, options?: Options) {
  const enabled = options?.enabled !== false;
  const onRegisteredRef = useRef(options?.onRegistered);
  onRegisteredRef.current = options?.onRegistered;
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!code || !enabled) return;

    let cancelled = false;

    const check = async () => {
      if (cancelled || registeredRef.current) return;

      const next = await checkDeviceRegisteredOnServer(code);
      if (cancelled || registeredRef.current) return;

      if (next === "registered") {
        registeredRef.current = true;
        onRegisteredRef.current?.(code);
      }
    };

    void check();

    const pollId = isSupabaseConfigured()
      ? window.setInterval(() => void check(), REGISTRATION_POLL_MS)
      : undefined;

    const onVisible = () => {
      if (document.hidden || cancelled || registeredRef.current) return;
      void check();
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
      if (pollId != null) window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVisible);
      removeCapListener?.();
    };
  }, [code, enabled]);
}

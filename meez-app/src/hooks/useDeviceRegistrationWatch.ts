import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { isSupabaseConfigured } from "@/config/env";
import {
  peekDeviceRegistration,
  type RegistrationPeek,
} from "@/services/kiosk-check";

const REGISTRATION_POLL_MS = 5_000;

type Options = {
  enabled?: boolean;
  onStatus?: (peek: RegistrationPeek) => void;
  onRegistered?: (code: string) => void;
};

/** polling + فحص عند العودة للمقدمة */
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

    const check = async () => {
      if (cancelled || registeredRef.current) return;

      const next = await peekDeviceRegistration(code, true);
      if (cancelled || registeredRef.current) return;

      onStatusRef.current?.(next);

      if (next.status === "registered") {
        registeredRef.current = true;
        onRegisteredRef.current?.(code);
      }
    };

    void check();

    const pollId = isSupabaseConfigured()
      ? setInterval(() => void check(), REGISTRATION_POLL_MS)
      : undefined;

    const onAppState = (state: AppStateStatus) => {
      if (state === "active" && !cancelled && !registeredRef.current) {
        void check();
      }
    };

    const sub = AppState.addEventListener("change", onAppState);

    return () => {
      cancelled = true;
      if (pollId != null) clearInterval(pollId);
      sub.remove();
    };
  }, [code, enabled]);
}

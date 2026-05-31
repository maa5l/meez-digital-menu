import { useEffect, useRef } from "react";
import {
  checkDeviceRegistrationOnKiosk,
  isDeviceActivatedOnKiosk,
} from "@/services/device/activation";
import { shouldUseVenueDatabase } from "@/services/venue/venue-supabase.service";
import { subscribeDeviceActivationChanges } from "@/services/venue/venue-realtime.service";

type Options = {
  enabled?: boolean;
  onRegistered?: () => void;
};

/** Realtime + فحص عند الفتح/العودة للواجهة (بدون polling) */
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

      const next = shouldUseVenueDatabase()
        ? await checkDeviceRegistrationOnKiosk(code)
        : (await isDeviceActivatedOnKiosk(code)) ? "registered" : "not_registered";

      if (cancelled || registeredRef.current) return;

      if (next === "registered") {
        registeredRef.current = true;
        onRegisteredRef.current?.();
      }
    };

    void check();

    const unsubscribe = shouldUseVenueDatabase()
      ? subscribeDeviceActivationChanges(code, () => void check())
      : () => {};

    const onVisible = () => {
      if (document.hidden || cancelled || registeredRef.current) return;
      void check();
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [code, enabled]);
}

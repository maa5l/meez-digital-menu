import { useEffect, useRef } from "react";
import {
  checkDeviceRegistrationOnKiosk,
  isDeviceActivatedOnKiosk,
} from "@/services/device/activation";
import { shouldUseVenueDatabase } from "@/services/venue/venue-supabase.service";

const POLL_STEPS_MS = [8_000, 12_000, 20_000, 30_000, 45_000] as const;
const HIDDEN_POLL_MS = 90_000;

type Options = {
  enabled?: boolean;
  onRegistered?: () => void;
};

/** مراقبة صامتة — لا تحدّث واجهة React */
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

      const next = shouldUseVenueDatabase()
        ? await checkDeviceRegistrationOnKiosk(code)
        : (await isDeviceActivatedOnKiosk(code)) ? "registered" : "not_registered";

      if (cancelled) return;

      if (next === "registered") {
        onRegisteredRef.current?.();
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

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [code, enabled]);
}

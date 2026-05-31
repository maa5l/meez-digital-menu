import { useCallback, useEffect, useState } from "react";
import { EmailRateLimitError, RateLimitError } from "@/lib/errors";

/** عدّ تنازلي بعد حد معدل إرسال OTP (عميل أو Supabase) */
export function useOtpCooldown() {
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!cooldownUntil) {
      setSecondsLeft(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) setCooldownUntil(0);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const applyRateLimitFromError = useCallback((error: unknown) => {
    if (error instanceof EmailRateLimitError || error instanceof RateLimitError) {
      setCooldownUntil(Date.now() + error.retryAfterMs);
    }
  }, []);

  const startCooldown = useCallback((ms: number) => {
    setCooldownUntil(Date.now() + ms);
  }, []);

  return {
    secondsLeft,
    isCoolingDown: secondsLeft > 0,
    applyRateLimitFromError,
    startCooldown,
  };
}

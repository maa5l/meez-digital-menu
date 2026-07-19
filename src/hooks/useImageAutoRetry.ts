import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 2_000;

/** إعادة محاولة تحميل الصور تلقائيًا عند الفشل المؤقت */
export function useImageAutoRetry(src: string | undefined) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setAttempt(0);
    setFailed(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [src]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleError = useCallback(() => {
    if (!src) {
      setFailed(true);
      return;
    }
    if (attempt + 1 >= MAX_ATTEMPTS) {
      logger.warn("image.load_failed", { src, attempts: attempt + 1 });
      setFailed(true);
      return;
    }
    const delay = BASE_DELAY_MS * (attempt + 1);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAttempt((value) => value + 1), delay);
  }, [src, attempt]);

  const displaySrc =
    src && attempt > 0 ? `${src}${src.includes("?") ? "&" : "?"}_retry=${attempt}` : src;

  return {
    displaySrc,
    failed: failed || !src,
    handleError,
    retrying: attempt > 0 && !failed,
    reloadKey: attempt,
  };
}

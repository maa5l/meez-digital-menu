import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  threshold?: number;
  idleMs?: number;
  delta?: number;
};

/** إظهار/إخفاء الهيدر حسب اتجاه التمرير + إظهار عند التوقف */
export function useScrollHeaderVisibility(
  scrollRoot: HTMLElement | null | undefined,
  { threshold = 24, idleMs = 400, delta = 4 }: Options = {},
) {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);
  const rafId = useRef<number>();
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();

  const reveal = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (!scrollRoot) return;

    const getY = () => scrollRoot.scrollTop;
    lastY.current = getY();

    const onScroll = () => {
      if (rafId.current != null) return;

      rafId.current = requestAnimationFrame(() => {
        rafId.current = undefined;
        const y = getY();
        const diff = y - lastY.current;

        if (y <= threshold) {
          setVisible(true);
        } else if (diff > delta) {
          setVisible(false);
        } else if (diff < -delta) {
          setVisible(true);
        }

        lastY.current = y;

        if (idleTimer.current) clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => setVisible(true), idleMs);
      });
    };

    scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scrollRoot.removeEventListener("scroll", onScroll);
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [scrollRoot, threshold, idleMs, delta]);

  return { visible, reveal, hide };
}

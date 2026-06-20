import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  threshold?: number;
};

/** إظهار/إخفاء الهيدر — يظهر فقط عند أعلى الصفحة */
export function useScrollHeaderVisibility(
  scrollRoot: HTMLElement | null | undefined,
  { threshold = 24 }: Options = {},
) {
  const [visible, setVisible] = useState(true);
  const rafId = useRef<number>();

  const reveal = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);

  const syncFromScroll = useCallback(
    (root: HTMLElement) => {
      setVisible(root.scrollTop <= threshold);
    },
    [threshold],
  );

  useEffect(() => {
    if (!scrollRoot) return;

    syncFromScroll(scrollRoot);

    const onScroll = () => {
      if (rafId.current != null) return;

      rafId.current = requestAnimationFrame(() => {
        rafId.current = undefined;
        syncFromScroll(scrollRoot);
      });
    };

    scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scrollRoot.removeEventListener("scroll", onScroll);
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, [scrollRoot, syncFromScroll]);

  return { visible, reveal, hide };
}

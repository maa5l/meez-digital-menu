import { useCallback, useEffect, useState } from "react";
import { useScrollHeaderVisibility } from "@/hooks/useScrollHeaderVisibility";

const MINUTE_MS = 60_000;

/** تمرير قالب المنيو: إخفاء الهيدر عند النزول (اختياري) + العودة للأعلى كل دقيقة */
export function useProductTemplateScroll(autoHideHeaderOnScroll = true) {
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null);
  const scrollRef = useCallback((node: HTMLElement | null) => setScrollRoot(node), []);
  const { visible: scrollVisible, reveal } = useScrollHeaderVisibility(scrollRoot);
  const headerVisible = autoHideHeaderOnScroll ? scrollVisible : true;

  useEffect(() => {
    if (!scrollRoot) return;

    const id = setInterval(() => {
      scrollRoot.scrollTo({ top: 0, behavior: "smooth" });
      reveal();
    }, MINUTE_MS);

    return () => clearInterval(id);
  }, [scrollRoot, reveal]);

  return { scrollRef, headerVisible };
}

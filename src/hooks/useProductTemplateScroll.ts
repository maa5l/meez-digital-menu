import { useCallback, useEffect, useState } from "react";
import { useScrollHeaderVisibility } from "@/hooks/useScrollHeaderVisibility";

const MINUTE_MS = 60_000;

/** تمرير قالب المنتجات: إخفاء الهيدر عند النزول + العودة للأعلى كل دقيقة */
export function useProductTemplateScroll() {
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null);
  const scrollRef = useCallback((node: HTMLElement | null) => setScrollRoot(node), []);
  const { visible: headerVisible, reveal } = useScrollHeaderVisibility(scrollRoot);

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

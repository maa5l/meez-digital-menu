import { useScrollHeaderVisibility } from "@/hooks/useScrollHeaderVisibility";
import { MENU_KIOSK_RESET_MS } from "@/lib/menu-kiosk";
import { useEffect, useState, useCallback } from "react";

/** تمرير قالب المنيو: إخفاء الهيدر عند النزول + العودة للأعلى دورياً (بدون إعادة تحميل البيانات) */
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
    }, MENU_KIOSK_RESET_MS);

    return () => clearInterval(id);
  }, [scrollRoot, reveal]);

  return { scrollRef, headerVisible };
}

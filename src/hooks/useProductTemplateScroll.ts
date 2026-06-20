import { useCallback, useEffect, useState } from "react";
import { useScrollHeaderVisibility } from "@/hooks/useScrollHeaderVisibility";
import { dispatchMenuKioskReset, MENU_KIOSK_RESET_MS } from "@/lib/menu-kiosk";

/** تمرير قالب المنيو: إخفاء الهيدر عند النزول (اختياري) + العودة للأعلى وتحديث كل 20 ثانية */
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
      dispatchMenuKioskReset();
    }, MENU_KIOSK_RESET_MS);

    return () => clearInterval(id);
  }, [scrollRoot, reveal]);

  return { scrollRef, headerVisible };
}

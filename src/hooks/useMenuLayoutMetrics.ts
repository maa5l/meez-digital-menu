import { useEffect, useState } from "react";
import {
  getMenuLayoutMetrics,
  type MenuLayoutMetrics,
} from "@/lib/menu-layout-metrics";

function readViewportWidth(): number {
  if (typeof window === "undefined") return 1024;
  return window.innerWidth;
}

/** مقاسات المنيو المتجاوبة — تُحدَّث عند تدوير الآيباد أو تغيير الحجم */
export function useMenuLayoutMetrics(): MenuLayoutMetrics {
  const [metrics, setMetrics] = useState(() => getMenuLayoutMetrics(readViewportWidth()));

  useEffect(() => {
    const update = () => setMetrics(getMenuLayoutMetrics(readViewportWidth()));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return metrics;
}

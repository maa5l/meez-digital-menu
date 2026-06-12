import { useCallback, useState } from "react";
import type { MenuLang } from "@/lib/product-i18n";

const STORAGE_KEY = "meez-menu-lang";

function readStoredLang(defaultLang: MenuLang): MenuLang {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "ar") return stored;
  } catch {
    /* private mode / blocked storage */
  }
  return defaultLang;
}

/** لغة المنيو — مشتركة بين القوالب والبانرات مع حفظ في الجلسة */
export function useMenuLang(defaultLang: MenuLang = "ar") {
  const [lang, setLang] = useState<MenuLang>(() => readStoredLang(defaultLang));

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next: MenuLang = prev === "ar" ? "en" : "ar";
      try {
        sessionStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { lang, toggleLang, setLang };
}

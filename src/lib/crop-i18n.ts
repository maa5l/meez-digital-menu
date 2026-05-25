import type { Crop } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";

export const cropFieldLabels = {
  ar: {
    country: "البلد",
    process: "المعالجة",
    variety: "السلالة",
    altitude: "الارتفاع",
    notes: "ملاحظات",
    featured: "مميّز",
    close: "إغلاق",
  },
  en: {
    country: "Country",
    process: "Process",
    variety: "Variety",
    altitude: "Altitude",
    notes: "Notes",
    featured: "Featured",
    close: "Close",
  },
} as const;

export function localizeCrop(crop: Crop, lang: MenuLang) {
  const useEn = lang === "en";
  return {
    beanName: (useEn && crop.beanNameEn?.trim()) || crop.beanName,
    country: (useEn && crop.countryEn?.trim()) || crop.country,
    process: (useEn && crop.processEn?.trim()) || crop.process,
    variety: crop.variety?.trim() || "—",
    altitude: crop.altitude?.trim() || "—",
    notes: (useEn && crop.notesEn?.trim()) || crop.notes || "",
  };
}

import type { Crop, CropBrewingInfo } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";

export const cropFieldLabels = {
  ar: {
    country: "بلد المنشأ",
    region: "المنطقة",
    farm: "المزرعة",
    producer: "المنتِج",
    process: "طريقة المعالجة",
    variety: "السلالة",
    altitude: "الارتفاع",
    roastLevel: "درجة التحميص",
    roastDate: "تاريخ التحميص",
    aroma: "الرائحة",
    acidity: "الحموضة",
    body: "الجسم",
    sweetness: "الحلاوة",
    flavorNotes: "نوتات التذوق",
    brewing: "توصيات التحضير",
    description: "الوصف",
    notes: "ملاحظات",
    featured: "مميّز",
    tapForDetails: "اضغط لعرض التفاصيل",
    close: "إغلاق",
    origin: "المنشأ",
    specifications: "المواصفات",
    sensory: "الملف الحسي",
    noImage: "صورة المحصول",
    brewingMethod: "طريقة التحضير",
    waterTemp: "حرارة الماء",
    brewRatio: "نسبة التحضير",
    grindSize: "درجة الطحن",
    brewTime: "مدة التحضير",
  },
  en: {
    country: "Origin",
    region: "Region",
    farm: "Farm",
    producer: "Producer",
    process: "Processing",
    variety: "Variety",
    altitude: "Altitude",
    roastLevel: "Roast Level",
    roastDate: "Roast Date",
    aroma: "Aroma",
    acidity: "Acidity",
    body: "Body",
    sweetness: "Sweetness",
    flavorNotes: "Flavor Notes",
    brewing: "Brewing Guide",
    description: "Description",
    notes: "Notes",
    featured: "Featured",
    tapForDetails: "Tap for details",
    close: "Close",
    origin: "Origin",
    specifications: "Specifications",
    sensory: "Sensory Profile",
    noImage: "Crop image",
    brewingMethod: "Method",
    waterTemp: "Water Temp",
    brewRatio: "Ratio",
    grindSize: "Grind Size",
    brewTime: "Brew Time",
  },
} as const;

export type LocalizedCrop = ReturnType<typeof localizeCrop>;

function pickBilingual(
  lang: MenuLang,
  ar?: string,
  en?: string,
): string {
  const useEn = lang === "en";
  const primary = useEn ? en?.trim() : ar?.trim();
  const fallback = useEn ? ar?.trim() : en?.trim();
  return primary || fallback || "";
}

export function localizeCrop(crop: Crop, lang: MenuLang) {
  return {
    beanName: pickBilingual(lang, crop.beanName, crop.beanNameEn) || "—",
    country: pickBilingual(lang, crop.country, crop.countryEn) || "—",
    region: pickBilingual(lang, crop.region, crop.regionEn),
    farm: pickBilingual(lang, crop.farm, crop.farmEn),
    producer: pickBilingual(lang, crop.producer, crop.producerEn),
    process: pickBilingual(lang, crop.process, crop.processEn) || "—",
    variety: crop.variety?.trim() || "—",
    altitude: crop.altitude?.trim() || "—",
    roastLevel: pickBilingual(lang, crop.roastLevel, crop.roastLevelEn),
    roastDate: crop.roastDate?.trim() || "",
    aroma: pickBilingual(lang, crop.aroma, crop.aromaEn),
    acidity: pickBilingual(lang, crop.acidity, crop.acidityEn),
    body: pickBilingual(lang, crop.body, crop.bodyEn),
    sweetness: pickBilingual(lang, crop.sweetness, crop.sweetnessEn),
    description: pickBilingual(lang, crop.description, crop.descriptionEn),
    notes: pickBilingual(lang, crop.notes, crop.notesEn) || "",
  };
}

export function localizeBrewing(brewing: CropBrewingInfo | undefined, lang: MenuLang) {
  if (!brewing) return null;
  const method = pickBilingual(lang, brewing.method, brewing.methodEn);
  const grindSize = pickBilingual(lang, brewing.grindSize, brewing.grindSizeEn);
  const waterTemp = brewing.waterTemp?.trim() || "";
  const ratio = brewing.ratio?.trim() || "";
  const brewTime = brewing.brewTime?.trim() || "";
  const hasAny = method || grindSize || waterTemp || ratio || brewTime;
  if (!hasAny) return null;
  return { method, grindSize, waterTemp, ratio, brewTime };
}

/** تحويل نوتات التذوق إلى شرائح — يدعم الفواصل الشائعة */
export function parseFlavorNotes(notes: string): string[] {
  if (!notes.trim()) return [];
  return [...new Set(notes.split(/[,·|;/\n]+/).map((s) => s.trim()).filter(Boolean))];
}

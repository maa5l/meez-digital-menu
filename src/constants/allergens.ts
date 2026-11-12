import type { LucideIcon } from "lucide-react";
import {
  Milk,
  Egg,
  Nut,
  TreePine,
  Wheat,
  Bean,
  Fish,
  Shell,
  Sprout,
  Sandwich,
  LeafyGreen,
  Flower2,
  FlaskConical,
  Waves,
} from "lucide-react";

export type AllergenOption = {
  id: string;
  labelAr: string;
  labelEn: string;
  /** اسم مختصر تحت أيقونة الهيدر */
  shortLabelAr: string;
  shortLabelEn: string;
  Icon: LucideIcon;
};

export const ALLERGEN_OPTIONS: AllergenOption[] = [
  { id: "milk", labelAr: "حليب / ألبان", labelEn: "Milk / Dairy", shortLabelAr: "حليب", shortLabelEn: "Milk", Icon: Milk },
  { id: "eggs", labelAr: "بيض", labelEn: "Eggs", shortLabelAr: "بيض", shortLabelEn: "Eggs", Icon: Egg },
  { id: "peanuts", labelAr: "فول سوداني", labelEn: "Peanuts", shortLabelAr: "فول", shortLabelEn: "Peanut", Icon: Nut },
  { id: "tree_nuts", labelAr: "مكسرات شجرية", labelEn: "Tree Nuts", shortLabelAr: "مكسرات", shortLabelEn: "Nuts", Icon: TreePine },
  { id: "wheat", labelAr: "قمح / غلوتين", labelEn: "Wheat / Gluten", shortLabelAr: "قمح", shortLabelEn: "Wheat", Icon: Wheat },
  { id: "soy", labelAr: "صويا", labelEn: "Soy", shortLabelAr: "صويا", shortLabelEn: "Soy", Icon: Bean },
  { id: "fish", labelAr: "سمك", labelEn: "Fish", shortLabelAr: "سمك", shortLabelEn: "Fish", Icon: Fish },
  { id: "shellfish", labelAr: "قشريات", labelEn: "Shellfish", shortLabelAr: "قشريات", shortLabelEn: "Shell", Icon: Shell },
  { id: "sesame", labelAr: "سمسم", labelEn: "Sesame", shortLabelAr: "سمسم", shortLabelEn: "Sesame", Icon: Sprout },
  { id: "mustard", labelAr: "خردل", labelEn: "Mustard", shortLabelAr: "خردل", shortLabelEn: "Mustard", Icon: Sandwich },
  { id: "celery", labelAr: "كرفس", labelEn: "Celery", shortLabelAr: "كرفس", shortLabelEn: "Celery", Icon: LeafyGreen },
  { id: "lupin", labelAr: "ترمس", labelEn: "Lupin", shortLabelAr: "ترمس", shortLabelEn: "Lupin", Icon: Flower2 },
  { id: "sulphites", labelAr: "كبريتات", labelEn: "Sulphites", shortLabelAr: "كبريتات", shortLabelEn: "Sulphite", Icon: FlaskConical },
  { id: "molluscs", labelAr: "رخويات", labelEn: "Molluscs", shortLabelAr: "رخويات", shortLabelEn: "Mollusc", Icon: Waves },
];

/** كل مسببات الحساسية المتاحة لأسطورة الهيدر (بنفس ترتيب القائمة) */
export const HEADER_ALLERGEN_IDS = ALLERGEN_OPTIONS.map((a) => a.id);

export type HeaderAllergenId = (typeof HEADER_ALLERGEN_IDS)[number];

const HEADER_ALLERGEN_SET = new Set<string>(HEADER_ALLERGEN_IDS);

export function getHeaderAllergenOptions(): AllergenOption[] {
  return [...ALLERGEN_OPTIONS];
}

function coerceAllergenIdList(ids: unknown): string[] | null | undefined {
  if (ids == null) return ids as null | undefined;
  if (Array.isArray(ids)) {
    return ids.map((id) => String(id ?? "").trim()).filter(Boolean);
  }
  if (typeof ids === "string") {
    const parts = ids
      .split(/[,|;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length ? parts : [];
  }
  return undefined;
}

/**
 * undefined = كل المسببات ظاهرة (الافتراضي).
 * [] = إخفاء الأسطورة.
 * وإلا تُعرض المسببات المختارة فقط وبالترتيب الثابت.
 */
export function resolveHeaderAllergenIds(ids?: string[] | null): string[] {
  const list = coerceAllergenIdList(ids);
  if (list == null) return [...HEADER_ALLERGEN_IDS];
  const selected = new Set(list.filter((id) => HEADER_ALLERGEN_SET.has(id)));
  return HEADER_ALLERGEN_IDS.filter((id) => selected.has(id));
}

export function sanitizeHeaderAllergenIds(ids?: string[] | null): string[] | undefined {
  const list = coerceAllergenIdList(ids);
  if (list == null) return undefined;
  return resolveHeaderAllergenIds(list);
}

/** يحوّل الاختيارات إلى نص — نفس حقل `allergens` / `allergensEn` */
export function formatAllergensString(ids: string[], lang: "ar" | "en" = "ar"): string | undefined {
  if (!ids.length) return undefined;
  const labels = ids
    .map((id) => {
      const opt = ALLERGEN_OPTIONS.find((a) => a.id === id);
      return lang === "en" ? opt?.labelEn : opt?.labelAr;
    })
    .filter(Boolean);
  if (!labels.length) return undefined;
  return labels.join(lang === "en" ? ", " : "، ");
}

/** يجمع معرّفات المسببات من الحقلين العربي والإنجليزي */
export function resolveAllergenIds(allergens?: string, allergensEn?: string): string[] {
  return [...new Set([...parseAllergensIds(allergens), ...parseAllergensIds(allergensEn)])];
}

/** يسترجع معرّفات المسببات من النص المحفوظ */
export function parseAllergensIds(text?: string): string[] {
  if (!text?.trim()) return [];
  const parts = text.split(/[,،]/).map((s) => s.trim()).filter(Boolean);
  const ids = new Set<string>();
  for (const part of parts) {
    const opt = ALLERGEN_OPTIONS.find(
      (a) => a.id === part || a.labelAr === part || a.labelEn === part,
    );
    if (opt) ids.add(opt.id);
  }
  return [...ids];
}

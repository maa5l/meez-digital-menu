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
  Icon: LucideIcon;
};

export const ALLERGEN_OPTIONS: AllergenOption[] = [
  { id: "milk", labelAr: "حليب / ألبان", labelEn: "Milk / Dairy", Icon: Milk },
  { id: "eggs", labelAr: "بيض", labelEn: "Eggs", Icon: Egg },
  { id: "peanuts", labelAr: "فول سوداني", labelEn: "Peanuts", Icon: Nut },
  { id: "tree_nuts", labelAr: "مكسرات شجرية", labelEn: "Tree Nuts", Icon: TreePine },
  { id: "wheat", labelAr: "قمح / غلوتين", labelEn: "Wheat / Gluten", Icon: Wheat },
  { id: "soy", labelAr: "صويا", labelEn: "Soy", Icon: Bean },
  { id: "fish", labelAr: "سمك", labelEn: "Fish", Icon: Fish },
  { id: "shellfish", labelAr: "قشريات", labelEn: "Shellfish", Icon: Shell },
  { id: "sesame", labelAr: "سمسم", labelEn: "Sesame", Icon: Sprout },
  { id: "mustard", labelAr: "خردل", labelEn: "Mustard", Icon: Sandwich },
  { id: "celery", labelAr: "كرفس", labelEn: "Celery", Icon: LeafyGreen },
  { id: "lupin", labelAr: "ترمس", labelEn: "Lupin", Icon: Flower2 },
  { id: "sulphites", labelAr: "كبريتات", labelEn: "Sulphites", Icon: FlaskConical },
  { id: "molluscs", labelAr: "رخويات", labelEn: "Molluscs", Icon: Waves },
];

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

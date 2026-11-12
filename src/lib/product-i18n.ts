import type { Category, Product } from "@/types/domain";

export type MenuLang = "ar" | "en";

function textOf(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

export function localizeCategory(category: Category, lang: MenuLang) {
  const en = textOf(category.nameEn);
  const ar = textOf(category.name) || "—";
  return (lang === "en" && en) || ar;
}

export function localizeProduct(product: Product, lang: MenuLang) {
  const useEn = lang === "en";
  const nameEn = textOf(product.nameEn);
  const descEn = textOf(product.descriptionEn);
  const allergensEn = textOf(product.allergensEn);
  return {
    name: (useEn && nameEn) || textOf(product.name) || "—",
    description: (useEn && descEn) || textOf(product.description),
    allergens: (useEn && allergensEn) || textOf(product.allergens) || undefined,
  };
}

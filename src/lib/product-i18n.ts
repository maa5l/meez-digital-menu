import type { Category, Product } from "@/types/domain";

export type MenuLang = "ar" | "en";

export function localizeCategory(category: Category, lang: MenuLang) {
  return (lang === "en" && category.nameEn?.trim()) || category.name;
}

export function localizeProduct(product: Product, lang: MenuLang) {
  const useEn = lang === "en";
  return {
    name: (useEn && product.nameEn?.trim()) || product.name,
    description: (useEn && product.descriptionEn?.trim()) || product.description,
    allergens: (useEn && product.allergensEn?.trim()) || product.allergens,
  };
}

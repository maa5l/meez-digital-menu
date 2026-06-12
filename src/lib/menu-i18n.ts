import type { MenuLang } from "@/lib/product-i18n";

export type { MenuLang };

export const menuUi = {
  ar: {
    emptyProductsTitle: "المنيو فارغ",
    emptyProductsHint: "أضف تصنيفات ومنتجات من لوحة التحكم لتظهر قائمتك على الشاشة.",
    emptyCropsTitle: "لا توجد محاصيل بعد",
    emptyCropsHint: "أضف محاصيل البن من لوحة التحكم لتظهر هنا.",
    selectProduct: "اختر منتجًا",
    gracePeriodBanner: "فترة سماح — أكمل الدفع من لوحة التحكم لتجنب إيقاف الشاشة",
    langToggleLabel: "التبديل إلى الإنجليزية",
    langToggleShort: "EN",
  },
  en: {
    emptyProductsTitle: "Menu is empty",
    emptyProductsHint: "Add categories and products from the dashboard to display your menu.",
    emptyCropsTitle: "No crops yet",
    emptyCropsHint: "Add coffee crops from the dashboard to show them here.",
    selectProduct: "Select a product",
    gracePeriodBanner: "Grace period — complete payment in the dashboard to avoid screen suspension",
    langToggleLabel: "Switch to Arabic",
    langToggleShort: "عربي",
  },
} as const satisfies Record<MenuLang, Record<string, string>>;

export function getMenuUi(lang: MenuLang) {
  return menuUi[lang];
}

import type { LucideIcon } from "lucide-react";
import {
  Coffee,
  CreditCard,
  Eye,
  LayoutDashboard,
  LayoutTemplate,
  Palette,
  Sparkles,
  Star,
  UtensilsCrossed,
} from "lucide-react";

export type ThemeSectionId =
  | "overview"
  | "products-template"
  | "products-header"
  | "products-colors"
  | "products-cards"
  | "products-featured"
  | "crops-template"
  | "crops-header"
  | "crops-colors"
  | "crops-cards"
  | "crops-featured"
  | "preview";

export type ThemeSection = {
  id: ThemeSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  group: "general" | "products" | "crops" | "preview";
};

export const THEME_SECTIONS: ThemeSection[] = [
  {
    id: "overview",
    label: "نظرة عامة",
    description: "ملخص سريع لإعدادات المنيو",
    icon: LayoutDashboard,
    group: "general",
  },
  {
    id: "products-template",
    label: "قالب المنتجات",
    description: "شكل عرض قائمة المنتجات",
    icon: Star,
    group: "products",
  },
  {
    id: "products-header",
    label: "هيدر المنتجات",
    description: "البانر، الشعار، والعنوان",
    icon: LayoutTemplate,
    group: "products",
  },
  {
    id: "products-colors",
    label: "ألوان المنتجات",
    description: "خلفية، نص، ولون مميّز",
    icon: Palette,
    group: "products",
  },
  {
    id: "products-cards",
    label: "بطاقات المنتجات",
    description: "لون البطاقات وخلفية المنيو",
    icon: CreditCard,
    group: "products",
  },
  {
    id: "products-featured",
    label: "منتج مميّز",
    description: "تسليط الضوء على منتج",
    icon: Sparkles,
    group: "products",
  },
  {
    id: "crops-template",
    label: "قالب المحاصيل",
    description: "عرض كتالوج القهوة",
    icon: Coffee,
    group: "crops",
  },
  {
    id: "crops-header",
    label: "هيدر المحاصيل",
    description: "بانر وشعار منيو المحاصيل",
    icon: LayoutTemplate,
    group: "crops",
  },
  {
    id: "crops-colors",
    label: "ألوان المحاصيل",
    description: "ألوان منيو المحاصيل",
    icon: Palette,
    group: "crops",
  },
  {
    id: "crops-cards",
    label: "بطاقات المحاصيل",
    description: "خلفية وبطاقات المحاصيل",
    icon: CreditCard,
    group: "crops",
  },
  {
    id: "crops-featured",
    label: "محصول الشهر",
    description: "المحصول المميّز في المنيو",
    icon: Sparkles,
    group: "crops",
  },
  {
    id: "preview",
    label: "معاينة حية",
    description: "شاهد التغييرات فوراً",
    icon: Eye,
    group: "preview",
  },
];

export const THEME_SECTION_GROUPS: { key: ThemeSection["group"]; label: string; icon: LucideIcon }[] = [
  { key: "general", label: "عام", icon: LayoutDashboard },
  { key: "products", label: "منيو المنتجات", icon: UtensilsCrossed },
  { key: "crops", label: "محاصيل البن", icon: Coffee },
  { key: "preview", label: "معاينة", icon: Eye },
];

import type { ReactNode } from "react";
import { ALLERGEN_OPTIONS, resolveAllergenIds } from "@/constants/allergens";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";

type Props = {
  allergens?: string;
  allergensEn?: string;
  lang?: MenuLang;
  size?: "xs" | "sm" | "md";
  className?: string;
  emptyPlaceholder?: ReactNode;
};

const sizeStyles = {
  xs: { box: "h-5 w-5 rounded-[5px]", icon: "h-2.5 w-2.5" },
  sm: { box: "h-6 w-6 rounded-md", icon: "h-3 w-3" },
  md: { box: "h-9 w-9 rounded-xl", icon: "h-4 w-4" },
} as const;

const AllergenIcons = ({
  allergens,
  allergensEn,
  lang = "ar",
  size = "sm",
  className,
  emptyPlaceholder = <span className="font-semibold opacity-40">—</span>,
}: Props) => {
  const ids = resolveAllergenIds(allergens, allergensEn);
  const { box, icon } = sizeStyles[size];

  if (!ids.length) {
    return <>{emptyPlaceholder}</>;
  }

  return (
    <div
      dir="ltr"
      className={cn("flex max-w-full flex-wrap gap-1", className)}
      role="list"
      aria-label={lang === "en" ? "Allergens" : "مسببات الحساسية"}
    >
      {ids.map((id) => {
        const opt = ALLERGEN_OPTIONS.find((a) => a.id === id);
        if (!opt) return null;
        const { Icon } = opt;
        const label = lang === "en" ? opt.labelEn : opt.labelAr;
        return (
          <span
            key={id}
            role="listitem"
            title={label}
            className={cn("flex items-center justify-center bg-black/[0.08] text-[#1a1a1a]", box)}
          >
            <Icon className={icon} strokeWidth={2} aria-hidden />
          </span>
        );
      })}
    </div>
  );
};

export default AllergenIcons;

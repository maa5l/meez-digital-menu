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
  /** لون الأيقونة/الاسم — افتراضي نفس لون النص */
  color?: string;
};

/** مقاسات مطابقة لأسطورة الهيدر (أيقونة + اسم مختصر تحتها) */
const sizeStyles = {
  xs: {
    col: "w-[1.45rem] gap-px sm:w-[1.6rem]",
    box: "h-3.5 w-3.5 rounded-[3px] sm:h-4 sm:w-4",
    icon: "h-2 w-2 sm:h-2.5 sm:w-2.5",
    label: "text-[6px] sm:text-[7px]",
  },
  sm: {
    col: "w-[1.7rem] gap-0.5 sm:w-[1.85rem]",
    box: "h-4 w-4 rounded-[4px] sm:h-[1.125rem] sm:w-[1.125rem]",
    icon: "h-2.5 w-2.5 sm:h-3 sm:w-3",
    label: "text-[7px] sm:text-[8px]",
  },
  md: {
    col: "w-[2.1rem] gap-0.5 sm:w-[2.35rem]",
    box: "h-5 w-5 rounded-md sm:h-6 sm:w-6",
    icon: "h-3 w-3 sm:h-3.5 sm:w-3.5",
    label: "text-[8px] sm:text-[9px]",
  },
} as const;

const AllergenIcons = ({
  allergens,
  allergensEn,
  lang = "ar",
  size = "sm",
  className,
  emptyPlaceholder = <span className="font-semibold opacity-40">—</span>,
  color,
}: Props) => {
  const ids = resolveAllergenIds(allergens, allergensEn);
  const styles = sizeStyles[size];

  if (!ids.length) {
    return <>{emptyPlaceholder}</>;
  }

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className={cn("flex max-w-full flex-wrap items-start justify-start gap-0.5 sm:gap-1", className)}
      role="list"
      aria-label={lang === "en" ? "Allergens" : "مسببات الحساسية"}
      style={color ? { color } : undefined}
    >
      {ids.map((id) => {
        const opt = ALLERGEN_OPTIONS.find((a) => a.id === id);
        if (!opt) return null;
        const { Icon, shortLabelAr, shortLabelEn, labelAr, labelEn } = opt;
        const fullLabel = lang === "en" ? labelEn : labelAr;
        const shortLabel = lang === "en" ? shortLabelEn : shortLabelAr;
        return (
          <span
            key={id}
            role="listitem"
            title={fullLabel}
            className={cn("flex shrink-0 flex-col items-center", styles.col)}
          >
            <span
              className={cn(
                "flex items-center justify-center bg-black/[0.08]",
                color ? "" : "text-[#1a1a1a]",
                styles.box,
              )}
            >
              <Icon className={styles.icon} strokeWidth={2.5} aria-hidden />
            </span>
            <span
              className={cn(
                "max-w-full truncate text-center font-bold leading-none tracking-tight",
                styles.label,
              )}
            >
              {shortLabel}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export default AllergenIcons;

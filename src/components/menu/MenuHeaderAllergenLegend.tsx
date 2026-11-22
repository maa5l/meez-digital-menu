import AllergenIcons from "@/components/menu/AllergenIcons";
import {
  ALLERGEN_OPTIONS,
  formatAllergensString,
  resolveHeaderAllergenIds,
} from "@/constants/allergens";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";

type Props = {
  allergenIds?: string[] | null;
  color: string;
  lang?: MenuLang;
  className?: string;
  /** شريط كامل العرض بأسماء غير مختصرة */
  board?: boolean;
};

const BOARD_LABEL: Record<string, { ar: string; en: string }> = {
  milk: { ar: "حليب", en: "Milk" },
  eggs: { ar: "بيض", en: "Eggs" },
  peanuts: { ar: "فول سوداني", en: "Peanuts" },
  tree_nuts: { ar: "مكسرات", en: "Nuts" },
  wheat: { ar: "قمح", en: "Wheat" },
  soy: { ar: "صويا", en: "Soy" },
  fish: { ar: "سمك", en: "Fish" },
  shellfish: { ar: "قشريات", en: "Shellfish" },
  sesame: { ar: "سمسم", en: "Sesame" },
  mustard: { ar: "خردل", en: "Mustard" },
  celery: { ar: "كرفس", en: "Celery" },
  lupin: { ar: "ترمس", en: "Lupin" },
  sulphites: { ar: "كبريتيت", en: "Sulphites" },
  molluscs: { ar: "رخويات", en: "Molluscs" },
};

/** أسطورة الهيدر — شريط واحد بأسماء كاملة عند لوحة المنيو */
const MenuHeaderAllergenLegend = ({
  allergenIds,
  color,
  lang = "ar",
  className,
  board = false,
}: Props) => {
  const ids = resolveHeaderAllergenIds(allergenIds);
  if (!ids.length) return null;

  if (!board) {
    return (
      <AllergenIcons
        allergens={formatAllergensString(ids, "ar")}
        allergensEn={formatAllergensString(ids, "en")}
        lang={lang}
        size="legend"
        color={color}
        emptyPlaceholder={null}
        className={cn("w-full min-w-0 flex-nowrap justify-center gap-0.5", className)}
      />
    );
  }

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      role="list"
      aria-label={lang === "en" ? "Allergens" : "مسببات الحساسية"}
      className={cn(
        "flex h-16 w-full items-center rounded-[22px] bg-[rgba(70,25,5,0.24)] px-5 py-[9px]",
        className,
      )}
      style={{ color }}
    >
      {ids.map((id) => {
        const opt = ALLERGEN_OPTIONS.find((item) => item.id === id);
        if (!opt) return null;
        const label = BOARD_LABEL[id]?.[lang] ?? (lang === "en" ? opt.labelEn : opt.labelAr);
        const Icon = opt.Icon;
        return (
          <span
            key={id}
            role="listitem"
            title={label}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-[3px]"
          >
            <Icon className="h-6 w-6 shrink-0" strokeWidth={1.6} aria-hidden />
            <span className="whitespace-nowrap text-center text-[clamp(10px,1vw,15px)] font-medium leading-none">
              {label}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export default MenuHeaderAllergenLegend;

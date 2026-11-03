import {
  getHeaderAllergenOptions,
  resolveHeaderAllergenIds,
} from "@/constants/allergens";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";

type Props = {
  allergenIds?: string[] | null;
  color: string;
  lang?: MenuLang;
  className?: string;
};

/** أسطورة مسببات الحساسية — وسط الهيدر: أيقونة + اسم تحتها */
const MenuHeaderAllergenLegend = ({
  allergenIds,
  color,
  lang = "ar",
  className,
}: Props) => {
  const ids = resolveHeaderAllergenIds(allergenIds);
  if (!ids.length) return null;

  const options = getHeaderAllergenOptions().filter((o) => ids.includes(o.id));

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className={cn(
        "pointer-events-none flex max-w-[min(100%,36rem)] flex-wrap items-start justify-center gap-x-1 gap-y-0.5 sm:gap-x-1.5",
        className,
      )}
      role="list"
      aria-label={lang === "en" ? "Allergen legend" : "أسطورة مسببات الحساسية"}
    >
      {options.map(({ id, labelAr, labelEn, shortLabelAr, shortLabelEn, Icon }) => {
        const fullLabel = lang === "en" ? labelEn : labelAr;
        const shortLabel = lang === "en" ? shortLabelEn : shortLabelAr;
        return (
          <span
            key={id}
            role="listitem"
            title={fullLabel}
            className="flex w-[2.35rem] shrink-0 flex-col items-center gap-0.5 sm:w-[2.6rem]"
            style={{ color }}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-black/[0.08] sm:h-6 sm:w-6">
              <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={2.25} aria-hidden />
            </span>
            <span className="max-w-full truncate text-center text-[8px] font-bold leading-tight tracking-tight sm:text-[9px]">
              {shortLabel}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export default MenuHeaderAllergenLegend;

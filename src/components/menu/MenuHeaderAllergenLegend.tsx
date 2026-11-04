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

/** أسطورة صغيرة في وسط الهيدر — صف واحد ثابت الارتفاع، لا يوسّع الهيدر */
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
        "pointer-events-none flex max-h-[2.1rem] max-w-[min(100%,34rem)] flex-nowrap items-start justify-center gap-px overflow-hidden sm:gap-0.5",
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
            className="flex w-[1.45rem] shrink-0 flex-col items-center gap-px sm:w-[1.6rem]"
            style={{ color }}
          >
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] bg-black/[0.08] sm:h-4 sm:w-4">
              <Icon className="h-2 w-2 sm:h-2.5 sm:w-2.5" strokeWidth={2.5} aria-hidden />
            </span>
            <span className="max-w-full truncate text-center text-[6px] font-bold leading-none tracking-tight sm:text-[7px]">
              {shortLabel}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export default MenuHeaderAllergenLegend;

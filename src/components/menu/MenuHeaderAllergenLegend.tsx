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

/** أسطورة مسببات الحساسية — وسط الهيدر، أيقونات صغيرة ثابتة الموضع */
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
      dir="ltr"
      className={cn(
        "pointer-events-none flex max-w-[min(100%,28rem)] flex-wrap items-center justify-center gap-0.5 sm:gap-1",
        className,
      )}
      role="list"
      aria-label={lang === "en" ? "Allergen legend" : "أسطورة مسببات الحساسية"}
    >
      {options.map(({ id, labelAr, labelEn, Icon }) => {
        const label = lang === "en" ? labelEn : labelAr;
        return (
          <span
            key={id}
            role="listitem"
            title={label}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/[0.08] sm:h-7 sm:w-7"
            style={{ color }}
          >
            <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.25} aria-hidden />
            <span className="sr-only">{label}</span>
          </span>
        );
      })}
    </div>
  );
};

export default MenuHeaderAllergenLegend;

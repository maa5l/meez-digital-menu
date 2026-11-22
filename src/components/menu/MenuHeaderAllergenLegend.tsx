import AllergenIcons from "@/components/menu/AllergenIcons";
import {
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
};

/** أسطورة الهيدر — نفس أيقونات/أسماء المنتجات، بحجم أصغر وصف واحد */
const MenuHeaderAllergenLegend = ({
  allergenIds,
  color,
  lang = "ar",
  className,
}: Props) => {
  const ids = resolveHeaderAllergenIds(allergenIds);
  if (!ids.length) return null;

  const allergens = formatAllergensString(ids, "ar");
  const allergensEn = formatAllergensString(ids, "en");

  return (
    <AllergenIcons
      allergens={allergens}
      allergensEn={allergensEn}
      lang={lang}
      size="xs"
      color={color}
      emptyPlaceholder={null}
      className={cn(
        "max-h-[2.1rem] w-full min-w-0 max-w-full flex-nowrap justify-center gap-px overflow-hidden sm:gap-0.5",
        className,
      )}
    />
  );
};

export default MenuHeaderAllergenLegend;

import AllergenIcons from "@/components/menu/AllergenIcons";
import { Riyal } from "@/components/Brand";
import { localizeProduct, type MenuLang } from "@/lib/product-i18n";
import type { Product } from "@/types/domain";
import { cn } from "@/lib/utils";
import { ChevronRight, Flame, Sparkles } from "lucide-react";

/** عنصر القائمة الجانبية — اسم/سعر يمين، سعرات فوق وحساسية تحت يسار */
export const ProductListItemLabel = ({
  product,
  lang,
  accentColor,
  active,
  featured,
}: {
  product: Product;
  lang: MenuLang;
  accentColor?: string;
  active?: boolean;
  featured?: boolean;
}) => {
  const localized = localizeProduct(product, lang);

  const metaCol = (
    <div dir="ltr" className="flex shrink-0 flex-col items-start justify-center gap-0.5">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-[14px] font-bold leading-none",
          active ? "text-white/80" : "text-[#1a1a1a]/70",
        )}
      >
        <Flame className={cn("h-3.5 w-3.5 shrink-0", active ? "text-orange-200" : "text-orange-500")} />
        {product.calories}
      </span>
      <AllergenIcons
        allergens={product.allergens}
        allergensEn={product.allergensEn}
        lang={lang}
        size="xs"
        className={cn("justify-start", active && "opacity-90")}
        emptyPlaceholder={
          <span className={cn("text-[11px] font-bold leading-none", active ? "text-white/40" : "text-[#1a1a1a]/30")}>
            —
          </span>
        }
      />
    </div>
  );

  const titleCol = (
    <div className={cn("min-w-0 flex-1", lang === "ar" ? "text-right" : "text-left")}>
      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        className={cn(
          "truncate font-display text-[20px] font-black leading-tight",
          active ? "text-white" : "text-[#1a1a1a]",
        )}
      >
        {localized.name}
      </div>
      <div
        dir="ltr"
        className={cn(
          "mt-0.5 flex items-center text-[18px] font-semibold leading-tight",
          active ? "text-white/75" : "text-[#1a1a1a]/50",
          lang === "ar" ? "justify-end" : "justify-start",
        )}
      >
        <span className="inline-flex items-center gap-0.5">
          <Riyal className={cn("h-3.5 w-3.5 shrink-0", active ? "opacity-80" : "opacity-70")} />
          <span>{product.price}</span>
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex w-full items-center gap-2 text-start flex-row">
      <div className="flex shrink-0 items-center self-center">
        <ChevronRight className={cn("h-4 w-4", active ? "text-white/70" : "text-[#1a1a1a]/30")} />
        {featured && (
          <Sparkles
            className={cn("ms-1.5 h-3.5 w-3.5", active ? "text-white/90" : "opacity-80")}
            style={!active && accentColor ? { color: accentColor } : undefined}
            aria-hidden
          />
        )}
      </div>

      <div dir="ltr" className="flex min-w-0 flex-1 items-center gap-2">
        {lang === "ar" ? (
          <>
            {metaCol}
            {titleCol}
          </>
        ) : (
          <>
            {titleCol}
            {metaCol}
          </>
        )}
      </div>
    </div>
  );
};

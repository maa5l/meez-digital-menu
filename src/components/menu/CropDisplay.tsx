import { localizeCrop } from "@/lib/crop-i18n";
import type { Crop } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

/** عنصر القائمة الجانبية — بطاقة محصول مدمجة */
export const CropListItemLabel = ({
  crop,
  lang,
  accentColor,
  active,
  featured,
}: {
  crop: Crop;
  lang: MenuLang;
  accentColor?: string;
  active?: boolean;
  featured?: boolean;
}) => {
  const localized = localizeCrop(crop, lang);
  const subtitle = [localized.country, localized.process]
    .filter((v) => v && v !== "—")
    .join(" · ");

  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 text-start",
        lang === "ar" ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div className="min-w-0 flex-1">
        <div
          dir={lang === "ar" ? "rtl" : "ltr"}
          className={cn(
            "truncate font-display font-black leading-tight",
            active ? "text-white" : "text-[#1a1a1a]",
            "text-sm md:text-base",
          )}
        >
          {localized.beanName}
        </div>
        {subtitle && (
          <div
            className={cn(
              "mt-0.5 truncate text-xs font-semibold",
              active ? "text-white/75" : "text-[#1a1a1a]/50",
            )}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {featured && (
          <Sparkles
            className={cn("h-3.5 w-3.5", active ? "text-white/90" : "opacity-70")}
            style={!active && accentColor ? { color: accentColor } : undefined}
            aria-hidden
          />
        )}
        {lang === "ar" ? (
          <ChevronLeft className={cn("h-4 w-4", active ? "text-white/70" : "text-[#1a1a1a]/30")} />
        ) : (
          <ChevronRight className={cn("h-4 w-4", active ? "text-white/70" : "text-[#1a1a1a]/30")} />
        )}
      </div>
    </div>
  );
};

export { default as CropDetailView } from "@/components/menu/crop/CropDetailView";
export { default as CropCarouselCard } from "@/components/menu/crop/CropCarouselCard";
export { default as CropHeroImage } from "@/components/menu/crop/CropHeroImage";

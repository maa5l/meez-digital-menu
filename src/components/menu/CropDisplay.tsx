import { localizeCrop } from "@/lib/crop-i18n";
import type { Crop } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";
import { ChevronRight, Sparkles } from "lucide-react";

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
    <div className="flex w-full items-center gap-3 text-start flex-row">
      <ChevronRight className={cn("h-4 w-4 shrink-0", active ? "text-white/70" : "text-[#1a1a1a]/30")} />
      <div className="min-w-0 flex-1">
        <div
          dir={lang === "ar" ? "rtl" : "ltr"}
          className={cn(
            "truncate font-display font-black leading-tight text-[20px]",
            active ? "text-white" : "text-[#1a1a1a]",
          )}
        >
          {localized.beanName}
        </div>
        {subtitle && (
          <div
            className={cn(
              "mt-0.5 truncate text-[18px] font-semibold",
              active ? "text-white/75" : "text-[#1a1a1a]/50",
            )}
          >
            {subtitle}
          </div>
        )}
      </div>
      {featured && (
        <Sparkles
          className={cn("h-3.5 w-3.5 shrink-0", active ? "text-white/90" : "opacity-70")}
          style={!active && accentColor ? { color: accentColor } : undefined}
          aria-hidden
        />
      )}
    </div>
  );
};

export { default as CropDetailView } from "@/components/menu/crop/CropDetailView";
export { default as CropCarouselCard } from "@/components/menu/crop/CropCarouselCard";
export { default as CropHeroImage } from "@/components/menu/crop/CropHeroImage";

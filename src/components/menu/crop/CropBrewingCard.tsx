import CropInfoCard from "@/components/menu/crop/CropInfoCard";
import { brewingDisplayFields } from "@/lib/crop-profile";
import { cropFieldLabels, localizeBrewing } from "@/lib/crop-i18n";
import type { CropBrewingInfo } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";
import { Coffee } from "lucide-react";

type Props = {
  brewing: CropBrewingInfo | undefined;
  lang: MenuLang;
  accentColor: string;
  className?: string;
};

/** بطاقة توصيات التحضير */
const CropBrewingCard = ({ brewing, lang, accentColor, className }: Props) => {
  const localized = localizeBrewing(brewing, lang);
  if (!localized) return null;

  const fields = brewingDisplayFields(localized, lang);
  const L = cropFieldLabels[lang];

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-black/[0.06] bg-gradient-to-br from-white to-neutral-50/80 shadow-sm",
        className,
      )}
    >
      <div
        className="flex items-center gap-2.5 border-b border-black/[0.05] px-4 py-3 md:px-5"
        style={{ background: `${accentColor}08` }}
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: `${accentColor}18`, color: accentColor }}
        >
          <Coffee className="h-4 w-4" strokeWidth={2} />
        </span>
        <h3 className="font-display text-base font-black text-[#1a1a1a] md:text-lg">{L.brewing}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2.5 p-3.5 md:gap-3 md:p-4">
        {fields.map((f) => (
          <CropInfoCard
            key={f.key}
            icon={f.icon}
            label={f.label}
            value={f.value}
            lang={lang}
            compact
            accentColor={accentColor}
          />
        ))}
      </div>
    </section>
  );
};

export default CropBrewingCard;

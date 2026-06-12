import { useEffect, useState } from "react";
import type { Crop } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";
import { CropFieldsGrid, CropNotes, CropTitle } from "@/components/menu/CropDisplay";
import { resolveCropSurface } from "@/lib/crop-surface";
import { cn } from "@/lib/utils";

type Props = {
  crop: Crop;
  lang: MenuLang;
  fallbackTextColor: string;
  className?: string;
  onOpen?: () => void;
};

/** بطاقة المحصول الكبيرة — تفاصيل كاملة */
const CropFeatureCard = ({ crop, lang, fallbackTextColor, className, onOpen }: Props) => {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [crop.id, crop.image]);

  const surface = resolveCropSurface(crop, {
    textColor: fallbackTextColor,
    cardColor: `${fallbackTextColor}15`,
  });
  const showHeroImage = surface.hasImageBg && !imageFailed;

  return (
    <article
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      className={cn(
        "relative flex min-h-[320px] flex-col items-center justify-center overflow-hidden rounded-[2rem] p-8 md:min-h-[380px] md:p-12",
        onOpen && "cursor-pointer transition-transform hover:scale-[1.005] active:scale-[0.995]",
        className,
      )}
      style={{ background: surface.background, color: surface.foreground }}
    >
      {showHeroImage && surface.imageUrl && (
        <>
          <img
            src={surface.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
          <div className="absolute inset-0 bg-black/40" aria-hidden />
        </>
      )}

      <div className="relative z-10 flex w-full max-w-md flex-col items-center justify-center gap-6 md:gap-8">
        <CropTitle crop={crop} lang={lang} />
        <CropFieldsGrid crop={crop} lang={lang} />
        <CropNotes crop={crop} lang={lang} borderColor={surface.foreground} className="mt-0 w-full border-t pt-4" />
      </div>
    </article>
  );
};

export default CropFeatureCard;

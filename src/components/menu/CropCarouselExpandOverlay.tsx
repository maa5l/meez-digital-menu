import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import CropCenteredCard from "@/components/menu/crop/CropCenteredCard";
import { cropFieldLabels } from "@/lib/crop-i18n";
import type { Crop } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";

type Props = {
  crop: Crop;
  lang: MenuLang;
  accentColor: string;
  fallbackTextColor: string;
  featured?: boolean;
  onClose: () => void;
};

/** تكبير نفس بطاقة المحصول — البطاقات الأخرى في الخلف تبقى ظاهرة مع blur */
const CropCarouselExpandOverlay = ({
  crop,
  lang,
  accentColor,
  fallbackTextColor,
  featured,
  onClose,
}: Props) => {
  const L = cropFieldLabels[lang];
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        className="absolute inset-0 z-10 touch-manipulation"
        onClick={onClose}
        aria-label={L.close}
      />
      <div
        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-3 md:p-5"
        role="dialog"
        aria-modal="true"
        aria-label={crop.beanName}
      >
        <div
          className={cn(
            "pointer-events-auto relative w-full max-w-[min(92vw,440px)]",
            "animate-in fade-in zoom-in-95 duration-300 motion-reduce:animate-none",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={cn(
              "absolute -top-2 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1a1a1a] shadow-lg ring-1 ring-black/10 touch-manipulation",
              lang === "ar" ? "-left-2" : "-right-2",
            )}
            aria-label={L.close}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>

          <CropCenteredCard
            crop={crop}
            lang={lang}
            accentColor={accentColor}
            fallbackTextColor={fallbackTextColor}
            featured={featured}
            variant="popup"
            scrollable
            className="aspect-[3/4] max-h-[min(84dvh,640px)] w-full shadow-2xl ring-1 ring-white/10"
          />
        </div>
      </div>
    </>
  );
};

export default CropCarouselExpandOverlay;

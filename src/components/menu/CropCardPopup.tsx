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

/** نافذة منبثقة صغيرة — تعرض بطاقة المحصول فقط */
const CropCardPopup = ({
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm overscroll-none md:p-6"
      onClick={onClose}
      dir={lang === "ar" ? "rtl" : "ltr"}
      role="dialog"
      aria-modal="true"
      aria-label={crop.beanName}
    >
      <div
        className="relative w-full max-w-[min(88vw,320px)] sm:max-w-[min(84vw,360px)] md:max-w-[min(72vw,400px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className={cn(
            "absolute -top-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1a1a1a] shadow-md ring-1 ring-black/10 touch-manipulation",
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
          className="aspect-[3/4] max-h-[min(78dvh,560px)] w-full shadow-2xl"
        />
      </div>
    </div>
  );
};

export default CropCardPopup;

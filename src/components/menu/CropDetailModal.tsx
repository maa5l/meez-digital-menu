import { useRef } from "react";
import CropCenteredCard from "@/components/menu/crop/CropCenteredCard";
import { MenuModalPortal } from "@/components/menu/MenuModalPortal";
import { cropFieldLabels } from "@/lib/crop-i18n";
import type { Crop } from "@/types/domain";
import { cn } from "@/lib/utils";

type Props = {
  crop: Crop;
  lang: "ar" | "en";
  accent: string;
  fallbackTextColor: string;
  featured?: boolean;
  onClose: () => void;
};

/** نافذة تفاصيل المحصول — نفس البطاقة (صورة + نص) بحجم أكبر */
const CropDetailModal = ({ crop, lang, accent, fallbackTextColor, featured, onClose }: Props) => {
  const L = cropFieldLabels[lang];
  const closeRef = useRef<HTMLButtonElement>(null);

  return (
    <MenuModalPortal
      onClose={onClose}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="max-w-[min(94vw,480px)]"
      labelledBy="crop-modal-title"
    >
      <div className="flex flex-col gap-3">
        <div className={cn("flex shrink-0", lang === "ar" ? "justify-start" : "justify-end")}>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-full bg-white/95 px-5 py-2.5 text-sm font-bold text-[#1a1a1a] shadow-lg ring-1 ring-black/[0.08] touch-manipulation"
            aria-label={L.close}
          >
            {L.close}
          </button>
        </div>

        <CropCenteredCard
          crop={crop}
          lang={lang}
          accentColor={accent}
          fallbackTextColor={fallbackTextColor}
          featured={featured}
          variant="popup"
          scrollable
          className="max-h-[min(88dvh,680px)] min-h-[min(72dvh,520px)] overflow-y-auto overscroll-y-contain shadow-2xl"
        />
        <span id="crop-modal-title" className="sr-only">
          {crop.beanName}
        </span>
      </div>
    </MenuModalPortal>
  );
};

export default CropDetailModal;

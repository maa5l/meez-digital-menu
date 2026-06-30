import { useEffect, useRef } from "react";
import { X, Sparkles } from "lucide-react";
import CropDetailView from "@/components/menu/crop/CropDetailView";
import { cropFieldLabels } from "@/lib/crop-i18n";
import type { Crop } from "@/types/domain";
import { cn } from "@/lib/utils";

type Props = {
  crop: Crop;
  lang: "ar" | "en";
  accent: string;
  featured?: boolean;
  onClose: () => void;
};

/** نافذة تفاصيل المحصول — ملء شاشة الآيباد */
const CropDetailModal = ({ crop, lang, accent, featured, onClose }: Props) => {
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
      className="fixed inset-0 z-[60] flex bg-black/75 backdrop-blur-sm"
      onClick={onClose}
      dir={lang === "ar" ? "rtl" : "ltr"}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
    >
      <div
        className={cn(
          "relative flex h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-[#faf8f5]",
          "pb-[env(safe-area-inset-bottom)]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "z-20 flex shrink-0 items-center justify-between border-b border-black/[0.05] bg-[#faf8f5]/95 px-4 py-3 backdrop-blur-md md:px-6",
            "pt-[max(0.75rem,env(safe-area-inset-top))]",
            lang === "ar" ? "flex-row-reverse" : "flex-row",
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {featured && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
                style={{ background: accent }}
              >
                <Sparkles className="h-3 w-3" aria-hidden />
                {L.featured}
              </span>
            )}
            <span
              id="crop-modal-title"
              className="truncate text-xs font-bold uppercase tracking-wider text-[#1a1a1a]/40"
            >
              {crop.beanName}
            </span>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#1a1a1a] shadow-sm ring-1 ring-black/[0.08] touch-manipulation"
            aria-label={L.close}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 md:px-6 md:py-5 ipad-lg:px-8">
          <CropDetailView
            crop={crop}
            lang={lang}
            accentColor={accent}
            featured={false}
            variant="full"
          />
        </div>
      </div>
    </div>
  );
};

export default CropDetailModal;

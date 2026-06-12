import { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";
import type { Crop } from "@/types/domain";
import { CropFieldsGrid, CropNotes, CropTitle } from "@/components/menu/CropDisplay";
import { cropFieldLabels } from "@/lib/crop-i18n";
import { resolveCropSurface } from "@/lib/crop-surface";

type Props = {
  crop: Crop;
  lang: "ar" | "en";
  accent: string;
  featured?: boolean;
  onClose: () => void;
};

const CropDetailModal = ({ crop, lang, accent, featured, onClose }: Props) => {
  const L = cropFieldLabels[lang];
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [crop.id, crop.image]);

  const surface = resolveCropSurface(crop, { textColor: "#1a1a1a", cardColor: "#f4f4f5" });
  const showHeroImage = surface.hasImageBg && !imageFailed;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
      dir={lang === "ar" ? "rtl" : "ltr"}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative min-h-[10rem] shrink-0 overflow-hidden px-6 pb-8 pt-5"
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
              <div className="absolute inset-0 bg-black/45" aria-hidden />
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#1a1a1a] shadow-sm"
            aria-label={L.close}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 mt-6">
            {featured && (
              <span
                className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white"
                style={{ background: accent }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {L.featured}
              </span>
            )}
            <CropTitle crop={crop} lang={lang} />
          </div>
        </div>

        <div className="overflow-y-auto px-6 pb-8 pt-2 text-center text-[#1a1a1a]">
          <CropFieldsGrid crop={crop} lang={lang} size="modal" className="gap-5" />
          <CropNotes crop={crop} lang={lang} className="border-black/10" />
        </div>
      </div>
    </div>
  );
};

export default CropDetailModal;

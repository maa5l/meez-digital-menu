import { X, Sparkles } from "lucide-react";
import type { Crop } from "@/types/domain";
import { CropFieldsGrid, CropNotes, CropTitle } from "@/components/menu/CropDisplay";
import { cropFieldLabels } from "@/lib/crop-i18n";

type Props = {
  crop: Crop;
  lang: "ar" | "en";
  accent: string;
  featured?: boolean;
  onClose: () => void;
};

const CropDetailModal = ({ crop, lang, accent, featured, onClose }: Props) => {
  const L = cropFieldLabels[lang];
  const showImage = crop.bgType === "image" && crop.image;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div
        className="bg-white w-full max-w-xl rounded-[2rem] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {showImage && (
          <div className="relative aspect-square w-full overflow-hidden bg-white">
            <img src={crop.image} alt="" className="h-full w-full object-cover object-center" />
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 start-3 w-9 h-9 rounded-full bg-white/95 shadow-sm flex items-center justify-center"
              aria-label={L.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="relative p-6 text-[#1a1a1a] text-center">
          {!showImage && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 start-4 w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
              aria-label={L.close}
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {featured && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white mb-4"
              style={{ background: accent }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {L.featured}
            </span>
          )}

          <CropTitle crop={crop} lang={lang} className="mb-6" />
          <CropFieldsGrid crop={crop} lang={lang} size="modal" className="gap-6" />
          <CropNotes crop={crop} lang={lang} className="border-black/10" />
        </div>
      </div>
    </div>
  );
};

export default CropDetailModal;

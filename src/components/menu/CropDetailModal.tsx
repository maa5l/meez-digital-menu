import { X, Sparkles } from "lucide-react";
import type { Crop } from "@/types/domain";

type Props = {
  crop: Crop;
  lang: "ar" | "en";
  accent: string;
  featured?: boolean;
  onClose: () => void;
};

const labels = {
  ar: {
    cropName: "اسم المحصول",
    country: "البلد",
    process: "المعالجة",
    variety: "السلالة",
    altitude: "الارتفاع",
    notes: "ملاحظات",
    featured: "مميّز",
  },
  en: {
    cropName: "Crop name",
    country: "Country",
    process: "Process",
    variety: "Variety",
    altitude: "Altitude",
    notes: "Notes",
    featured: "Featured",
  },
} as const;

const CropDetailModal = ({ crop, lang, accent, featured, onClose }: Props) => {
  const L = labels[lang];
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
          <div className="relative bg-white flex items-center justify-center px-4 py-6 min-h-[200px] max-h-[min(52vh,440px)]">
            <img
              src={crop.image}
              alt={crop.beanName}
              className="max-w-full max-h-[min(48vh,400px)] w-auto h-auto object-contain"
            />
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 start-3 w-9 h-9 rounded-full bg-white/95 shadow-sm flex items-center justify-center"
              aria-label={lang === "ar" ? "إغلاق" : "Close"}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-6 text-[#1a1a1a] relative">
          {!showImage && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 start-4 w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
              aria-label={lang === "ar" ? "إغلاق" : "Close"}
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {featured && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white mb-3"
              style={{ background: accent }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {L.featured}
            </span>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <DetailField
              className="col-span-2"
              prominent
              label={L.cropName}
              value={lang === "ar" ? crop.beanName : crop.beanNameEn || crop.beanName}
              accent={accent}
            />
            {crop.beanNameEn && lang === "ar" && (
              <DetailField className="col-span-2" label="Crop name" value={crop.beanNameEn} accent={accent} />
            )}
            {crop.beanNameEn && lang === "en" && crop.beanName && (
              <DetailField className="col-span-2" label="اسم المحصول" value={crop.beanName} accent={accent} />
            )}
            <DetailField label={L.country} value={lang === "ar" ? crop.country : crop.countryEn} accent={accent} />
            <DetailField label={L.process} value={lang === "ar" ? crop.process : crop.processEn} accent={accent} />
            <DetailField label={L.variety} value={crop.variety} accent={accent} />
            <DetailField label={L.altitude} value={crop.altitude} accent={accent} />
          </div>

          {(crop.notes || crop.notesEn) && (
            <div className="pt-4 border-t border-black/10">
              <div className="text-xs font-bold opacity-50 mb-1">{L.notes}</div>
              <p className="text-sm font-bold">{lang === "ar" ? crop.notes : crop.notesEn}</p>
              <p className="text-xs opacity-60 mt-1">{lang === "ar" ? crop.notesEn : crop.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DetailField = ({
  label,
  value,
  accent,
  className = "",
  prominent,
}: {
  label: string;
  value: string;
  accent: string;
  className?: string;
  prominent?: boolean;
}) => (
  <div className={`rounded-xl px-3 py-2.5 ${className}`} style={{ background: `${accent}12` }}>
    <div className="text-[10px] font-bold opacity-50">{label}</div>
    <div className={`mt-0.5 ${prominent ? "font-display font-black text-lg" : "font-bold"}`}>{value}</div>
  </div>
);

export default CropDetailModal;

import { cropFieldLabels } from "@/lib/crop-i18n";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";

type Props = {
  notes: string[];
  lang: MenuLang;
  accentColor: string;
  className?: string;
};

const chipPalette = [
  "bg-amber-50 text-amber-900 ring-amber-200/80",
  "bg-orange-50 text-orange-900 ring-orange-200/80",
  "bg-rose-50 text-rose-900 ring-rose-200/80",
  "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
  "bg-sky-50 text-sky-900 ring-sky-200/80",
  "bg-violet-50 text-violet-900 ring-violet-200/80",
];

/** نوتات التذوق كشرائح أنيقة */
const CropFlavorChips = ({ notes, lang, accentColor, className }: Props) => {
  const L = cropFieldLabels[lang];
  if (notes.length === 0) return null;

  return (
    <section className={cn("space-y-3", className)}>
      <h3
        className={cn(
          "font-bold uppercase tracking-wider text-[#1a1a1a]/45",
          "text-[10px] md:text-[11px]",
          lang === "ar" ? "text-right" : "text-left",
        )}
      >
        {L.flavorNotes}
      </h3>
      <div
        className={cn(
          "flex flex-wrap gap-2",
          lang === "ar" ? "justify-end" : "justify-start",
        )}
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        {notes.map((note, i) => (
          <span
            key={`${note}-${i}`}
            className={cn(
              "inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-bold ring-1",
              chipPalette[i % chipPalette.length],
            )}
            style={
              i === 0
                ? {
                    background: `${accentColor}12`,
                    color: accentColor,
                    boxShadow: `inset 0 0 0 1px ${accentColor}30`,
                  }
                : undefined
            }
          >
            {note}
          </span>
        ))}
      </div>
    </section>
  );
};

export default CropFlavorChips;

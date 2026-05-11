import { useState } from "react";
import { crops, type MenuSettings } from "@/lib/mockData";
import { Sparkles, Languages } from "lucide-react";
import { Logo } from "@/components/Brand";

/**
 * Crops Template — "Featured Header + Cards Carousel".
 * هيدر علوي يعرض "محصول الشهر" + لوقو + زر اللغة، ثم بطاقات أفقية للمحاصيل.
 */
const CropsTemplateMolo = ({ settings }: { settings: MenuSettings }) => {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const ordered = settings.featuredCropId
    ? [
        ...crops.filter((c) => c.id === settings.featuredCropId),
        ...crops.filter((c) => c.id !== settings.featuredCropId),
      ]
    : crops;

  const bgStyle: React.CSSProperties = settings.bgImage
    ? {
        backgroundImage: `linear-gradient(${settings.bgColor}cc, ${settings.bgColor}ee), url(${settings.bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: settings.textColor,
      }
    : { background: settings.bgColor, color: settings.textColor };

  const headerTitle =
    settings.featuredTitle || (lang === "ar" ? "محصول الشهر" : "Crop of the Month");

  return (
    <div className="h-full flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"} style={bgStyle}>
      {/* Header */}
      <header
        className="shrink-0 px-8 md:px-12 py-6 flex items-center justify-between gap-4"
        style={{ background: `${settings.textColor}10` }}
      >
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="flex items-center gap-1.5 text-sm font-bold opacity-80 hover:opacity-100"
        >
          <Languages className="w-4 h-4" />
          {lang === "ar" ? "EN" : "AR"}
        </button>

        <h1 className="font-display font-black text-2xl md:text-4xl text-center flex-1">
          {headerTitle}
        </h1>

        <Logo className="h-9 md:h-11 w-auto aspect-[1031/736]" />
      </header>

      {/* Cards carousel */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 md:px-10 py-8">
        <div className="flex gap-5 h-full snap-x snap-mandatory">
          {ordered.map((c) => {
            const isFeatured = c.id === settings.featuredCropId;
            const fg = c.textColor || settings.textColor;
            let bg: string = c.cardColor || `${settings.textColor}15`;
            const showImage = c.bgType === "image" && c.image;
            if (c.bgType === "gradient" && c.gradientColors?.length) {
              bg = `linear-gradient(135deg, ${c.gradientColors.join(", ")})`;
            } else if (c.bgType === "color" && c.cardColor) {
              bg = c.cardColor;
            }
            return (
              <article
                key={c.id}
                className="snap-center shrink-0 w-[72vw] md:w-[360px] h-full rounded-[2rem] p-7 md:p-8 flex flex-col relative overflow-hidden"
                style={{
                  background: bg,
                  color: fg,
                  ...(isFeatured ? { boxShadow: `0 0 0 3px ${settings.accentColor}` } : {}),
                }}
              >
                {showImage && (
                  <>
                    <img src={c.image} alt={c.beanName} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/35" />
                  </>
                )}
                {isFeatured && (
                  <div
                    className="absolute top-4 left-4 flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: settings.accentColor, color: "#fff" }}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> {lang === "ar" ? "مميّز" : "Featured"}
                  </div>
                )}

                <div className="relative">
                  <h2 className="font-display font-black text-xl md:text-2xl leading-tight">
                    {c.beanName}
                  </h2>
                  <p className="text-base md:text-lg opacity-80 mt-1">{c.beanNameEn}</p>
                </div>

                <div className="relative flex-1 flex flex-col justify-center gap-5 mt-6 text-sm md:text-base">
                  <Field
                    label={lang === "ar" ? "البلد" : "Country"}
                    value={lang === "ar" ? c.country : c.countryEn}
                  />
                  <Field
                    label={lang === "ar" ? "المعالجة" : "Process"}
                    value={lang === "ar" ? c.process : c.processEn}
                  />
                  <Field
                    label={lang === "ar" ? "السلالة" : "Variety"}
                    value={c.variety}
                  />
                  <Field
                    label={lang === "ar" ? "الارتفاع" : "Altitude"}
                    value={c.altitude}
                  />
                </div>

                <div className="relative text-center mt-6 pt-5 border-t" style={{ borderColor: `${fg}25` }}>
                  <div className="font-bold text-base">{c.notes}</div>
                  <div className="text-sm opacity-70 mt-0.5">{c.notesEn}</div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-xs opacity-60">{label}</div>
    <div className="font-bold mt-0.5">{value}</div>
  </div>
);

export default CropsTemplateMolo;

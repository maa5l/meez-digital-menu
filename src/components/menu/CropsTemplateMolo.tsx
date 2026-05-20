import { useState } from "react";
import type { Crop, MenuSettings } from "@/types/domain";
import { Sparkles } from "lucide-react";
import CropDetailModal from "@/components/menu/CropDetailModal";
import CropsLangToggle from "@/components/menu/CropsLangToggle";
import { MenuCropsTopChrome } from "@/components/menu/MenuCropsTopChrome";
import { MenuProductSubheaderBar } from "@/components/menu/MenuProductTopChrome";
import { useProductTemplateScroll } from "@/hooks/useProductTemplateScroll";
import { getCropsHeaderCustomization } from "@/lib/menu-header-settings";
import { getCropsPalette, palettePageStyle } from "@/lib/menu-palette";

/**
 * Crops Template — "Featured Header + Cards Carousel".
 */
const CropsTemplateMolo = ({ settings, crops }: { settings: MenuSettings; crops: Crop[] }) => {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [modal, setModal] = useState<Crop | null>(null);
  const { scrollRef, headerVisible } = useProductTemplateScroll();
  const cropsHeader = getCropsHeaderCustomization(settings);
  const showLang = cropsHeader.showLanguageToggle !== false;

  const ordered = settings.featuredCropId
    ? [
        ...crops.filter((c) => c.id === settings.featuredCropId),
        ...crops.filter((c) => c.id !== settings.featuredCropId),
      ]
    : crops;

  const palette = getCropsPalette(settings);
  const bgStyle = palettePageStyle(palette);

  return (
    <div className="relative h-full flex flex-col min-h-0" dir={lang === "ar" ? "rtl" : "ltr"} style={bgStyle}>
      <MenuCropsTopChrome
        settings={settings}
        lang={lang}
        visible={headerVisible}
        scrollRef={scrollRef}
        subheader={
          showLang ? (
            <MenuProductSubheaderBar settings={settings}>
              <CropsLangToggle
                lang={lang}
                textColor={palette.textColor}
                onToggle={() => setLang(lang === "ar" ? "en" : "ar")}
              />
            </MenuProductSubheaderBar>
          ) : undefined
        }
      >
        <div className="flex min-h-[50vh] flex-col px-6 py-8 md:px-10">
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex h-full snap-x snap-mandatory gap-5">
              {ordered.map((c) => {
                const isFeatured = c.id === settings.featuredCropId;
                const fg = c.textColor || palette.textColor;
                let bg: string = c.cardColor || `${palette.textColor}15`;
                const showImage = c.bgType === "image" && c.image;
                if (c.bgType === "gradient" && c.gradientColors?.length) {
                  bg = `linear-gradient(135deg, ${c.gradientColors.join(", ")})`;
                } else if (c.bgType === "color" && c.cardColor) {
                  bg = c.cardColor;
                }
                return (
                  <article
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setModal(c)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setModal(c);
                      }
                    }}
                    className="snap-center shrink-0 w-[72vw] md:w-[360px] h-[min(70vh,520px)] rounded-[2rem] p-7 md:p-8 flex flex-col relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
                    style={{
                      background: bg,
                      color: fg,
                      ...(isFeatured ? { boxShadow: `0 0 0 3px ${palette.accentColor}` } : {}),
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
                        style={{ background: palette.accentColor, color: "#fff" }}
                      >
                        <Sparkles className="w-3.5 h-3.5" /> {lang === "ar" ? "مميّز" : "Featured"}
                      </div>
                    )}

                    <div className="relative">
                      <h2 className="font-display font-black text-xl md:text-2xl leading-tight">{c.beanName}</h2>
                      <p className="text-base md:text-lg opacity-80 mt-1">{c.beanNameEn}</p>
                    </div>

                    <div className="relative flex-1 flex flex-col justify-center gap-5 mt-6 text-sm md:text-base">
                      <Field
                        label={lang === "ar" ? "اسم المحصول" : "Crop name"}
                        value={lang === "ar" ? c.beanName : c.beanNameEn || c.beanName}
                      />
                      <Field
                        label={lang === "ar" ? "البلد" : "Country"}
                        value={lang === "ar" ? c.country : c.countryEn}
                      />
                      <Field
                        label={lang === "ar" ? "المعالجة" : "Process"}
                        value={lang === "ar" ? c.process : c.processEn}
                      />
                      <Field label={lang === "ar" ? "السلالة" : "Variety"} value={c.variety} />
                      <Field label={lang === "ar" ? "الارتفاع" : "Altitude"} value={c.altitude} />
                    </div>

                    <div
                      className="relative text-center mt-6 pt-5 border-t"
                      style={{ borderColor: `${fg}25` }}
                    >
                      <div className="font-bold text-base">{c.notes}</div>
                      <div className="text-sm opacity-70 mt-0.5">{c.notesEn}</div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </MenuCropsTopChrome>

      {modal && (
        <CropDetailModal
          crop={modal}
          lang={lang}
          accent={palette.accentColor}
          featured={modal.id === settings.featuredCropId}
          onClose={() => setModal(null)}
        />
      )}
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

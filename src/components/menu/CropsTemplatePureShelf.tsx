import { useState } from "react";
import type { Crop, MenuSettings } from "@/types/domain";
import { Sparkles } from "lucide-react";
import CropDetailModal from "@/components/menu/CropDetailModal";
import { CropFieldsGrid, CropListItemLabel, CropNotes, CropTitle } from "@/components/menu/CropDisplay";
import CropsLangToggle from "@/components/menu/CropsLangToggle";
import { MenuCropsTopChrome } from "@/components/menu/MenuCropsTopChrome";
import { MenuProductSubheaderBar } from "@/components/menu/MenuProductTopChrome";
import { useProductTemplateScroll } from "@/hooks/useProductTemplateScroll";
import { cropFieldLabels } from "@/lib/crop-i18n";
import { getCropsHeaderCustomization } from "@/lib/menu-header-settings";
import { getCropsPalette, palettePageStyle } from "@/lib/menu-palette";

/**
 * Crops Template — "Featured Detail + Side List".
 */
const CropsTemplatePureShelf = ({ settings, crops }: { settings: MenuSettings; crops: Crop[] }) => {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [modal, setModal] = useState<Crop | null>(null);
  const { scrollRef, headerVisible } = useProductTemplateScroll();
  const cropsHeader = getCropsHeaderCustomization(settings);
  const showLang = cropsHeader.showLanguageToggle !== false;

  const initial = crops.find((c) => c.id === settings.featuredCropId) || crops[0]!;
  const [active, setActive] = useState<Crop>(initial);
  const palette = getCropsPalette(settings);

  const fg = active.textColor || palette.textColor;
  let bg: string = active.cardColor || `${palette.textColor}15`;
  const showImage = active.bgType === "image" && active.image;
  if (active.bgType === "gradient" && active.gradientColors?.length) {
    bg = `linear-gradient(135deg, ${active.gradientColors.join(", ")})`;
  } else if (active.bgType === "color" && active.cardColor) {
    bg = active.cardColor;
  }

  const pageBg = palettePageStyle(palette);

  return (
    <div className="relative h-full flex flex-col min-h-0" dir={lang === "ar" ? "rtl" : "ltr"} style={pageBg}>
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
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-5 p-6 md:p-8 min-h-[60vh]">
          <article
            role="button"
            tabIndex={0}
            onClick={() => setModal(active)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setModal(active);
              }
            }}
            className="relative rounded-[2rem] p-8 md:p-12 overflow-hidden flex flex-col cursor-pointer transition-transform hover:scale-[1.005] active:scale-[0.995] min-h-[320px]"
            style={{ background: bg, color: fg }}
          >
            {showImage && (
              <>
                <img src={active.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40" />
              </>
            )}
            <div className="relative">
              <CropTitle crop={active} lang={lang} />
            </div>

            <div className="relative flex-1 flex flex-col justify-center mt-8">
              <CropFieldsGrid crop={active} lang={lang} />
            </div>

            <CropNotes crop={active} lang={lang} borderColor={fg} className="relative" />
          </article>

          <aside className="flex flex-col gap-3">
            {crops.map((c) => {
              const isActive = c.id === active.id;
              const isFeatured = c.id === settings.featuredCropId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActive(c);
                    setModal(c);
                  }}
                  className="rounded-2xl px-5 py-4 transition-all relative w-full text-center"
                  style={{
                    background: isActive ? palette.accentColor : `${palette.textColor}15`,
                    color: isActive ? "#fff" : palette.textColor,
                  }}
                >
                  <CropListItemLabel crop={c} lang={lang} />
                  {isFeatured && (
                    <Sparkles
                      className="w-3.5 h-3.5 absolute top-3 end-3 opacity-90"
                      aria-label={cropFieldLabels[lang].featured}
                    />
                  )}
                </button>
              );
            })}
          </aside>
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

export default CropsTemplatePureShelf;

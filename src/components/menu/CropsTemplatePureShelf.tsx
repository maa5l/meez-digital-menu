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
            <div className="relative text-center">
              <h2 className="font-display font-black text-2xl md:text-4xl leading-tight">{active.beanName}</h2>
              <p className="text-lg md:text-2xl opacity-80 mt-1">{active.beanNameEn}</p>
            </div>

            <div className="relative flex-1 grid grid-cols-2 gap-x-12 gap-y-8 content-center mt-8 max-w-3xl mx-auto w-full">
              <BigField
                labelAr="اسم المحصول"
                labelEn="Crop name"
                valueAr={active.beanName}
                valueEn={active.beanNameEn || active.beanName}
              />
              <BigField labelAr="البلد" labelEn="Country" valueAr={active.country} valueEn={active.countryEn} />
              <BigField labelAr="المعالجة" labelEn="Process" valueAr={active.process} valueEn={active.processEn} />
              <BigField labelAr="السلالة" labelEn="Variety" valueAr={active.variety} valueEn={active.variety} />
              <BigField labelAr="الارتفاع" labelEn="Altitude" valueAr={active.altitude} valueEn={active.altitude} />
            </div>

            <div className="relative text-center mt-6">
              <div className="font-bold text-lg md:text-xl">{active.notes}</div>
              <div className="text-base opacity-70">{active.notesEn}</div>
            </div>
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
                  className="text-right rounded-2xl px-5 py-4 transition-all relative w-full"
                  style={{
                    background: isActive ? palette.accentColor : `${palette.textColor}15`,
                    color: isActive ? "#fff" : palette.textColor,
                  }}
                >
                  <div className="font-display font-black text-sm md:text-base leading-tight">{c.beanName}</div>
                  <div className="text-xs md:text-sm opacity-80 mt-0.5">{c.beanNameEn}</div>
                  {isFeatured && <Sparkles className="w-3.5 h-3.5 absolute top-3 left-3 opacity-90" />}
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

const BigField = ({
  labelAr,
  labelEn,
  valueAr,
  valueEn,
}: {
  labelAr: string;
  labelEn: string;
  valueAr: string;
  valueEn: string;
}) => (
  <div>
    <div className="text-sm opacity-70">{labelEn}</div>
    <div className="font-bold text-lg md:text-xl mt-0.5">{valueEn}</div>
    <div className="text-sm opacity-70 mt-2">{labelAr}</div>
    <div className="font-bold text-lg md:text-xl mt-0.5">{valueAr}</div>
  </div>
);

export default CropsTemplatePureShelf;

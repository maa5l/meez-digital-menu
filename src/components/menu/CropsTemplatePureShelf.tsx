import { useCallback, useRef, useState } from "react";
import type { Crop, MenuSettings } from "@/types/domain";
import { Sparkles } from "lucide-react";
import CropDetailModal from "@/components/menu/CropDetailModal";
import CropFeatureCard from "@/components/menu/CropFeatureCard";
import { CropListItemLabel } from "@/components/menu/CropDisplay";
import MenuLangToggle from "@/components/menu/MenuLangToggle";
import { MenuCropsTopChrome } from "@/components/menu/MenuCropsTopChrome";
import { MenuProductSubheaderBar } from "@/components/menu/MenuProductTopChrome";
import { useMenuLang } from "@/context/MenuLangContext";
import { useProductTemplateScroll } from "@/hooks/useProductTemplateScroll";
import { cropFieldLabels } from "@/lib/crop-i18n";
import { getCropsHeaderCustomization, isCropsLangToggleEnabled } from "@/lib/menu-header-settings";
import { getCropsPalette, palettePageStyle } from "@/lib/menu-palette";

/**
 * Crops Template — "Featured Detail + Side List".
 * Mobile: القائمة أولاً ثم بطاقة التفاصيل تحتها مباشرة.
 */
const CropsTemplatePureShelf = ({ settings, crops }: { settings: MenuSettings; crops: Crop[] }) => {
  const { lang, toggleLang } = useMenuLang();
  const [modal, setModal] = useState<Crop | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const cropsHeader = getCropsHeaderCustomization(settings);
  const showLang = isCropsLangToggleEnabled(settings);
  const hideHeader = cropsHeader.hideHeader === true;
  const autoHideHeader = !hideHeader && cropsHeader.autoHideHeaderOnScroll !== false;
  const { scrollRef, headerVisible } = useProductTemplateScroll(autoHideHeader);

  const initial = crops.find((c) => c.id === settings.featuredCropId) || crops[0]!;
  const [active, setActive] = useState<Crop>(initial);
  const palette = getCropsPalette(settings);
  const pageBg = palettePageStyle(palette);

  const selectCrop = useCallback((crop: Crop) => {
    setActive(crop);
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  return (
    <div className="relative flex h-full min-h-0 flex-col" dir={lang === "ar" ? "rtl" : "ltr"} style={pageBg}>
      <MenuCropsTopChrome
        settings={settings}
        lang={lang}
        visible={headerVisible}
        hideHeader={hideHeader}
        showLangInCompactBar={hideHeader && showLang}
        onLangToggle={toggleLang}
        scrollRef={scrollRef}
        subheader={
          !hideHeader && showLang ? (
            <MenuProductSubheaderBar settings={settings}>
              <div className="flex justify-end" dir="ltr">
                <MenuLangToggle
                  lang={lang}
                  textColor={palette.textColor}
                  onToggle={toggleLang}
                  variant="tab"
                />
              </div>
            </MenuProductSubheaderBar>
          ) : undefined
        }
      >
        <div className="flex min-h-[60vh] flex-col gap-5 p-6 md:grid md:grid-cols-[1fr_280px] md:gap-5 md:p-8">
          <aside className="order-1 flex flex-col gap-3 md:order-2">
            {crops.map((c) => {
              const isActive = c.id === active.id;
              const isFeatured = c.id === settings.featuredCropId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCrop(c)}
                  className="relative w-full rounded-2xl px-5 py-4 text-center transition-all"
                  style={{
                    background: isActive ? palette.accentColor : `${palette.textColor}15`,
                    color: isActive ? "#fff" : palette.textColor,
                  }}
                >
                  <CropListItemLabel crop={c} lang={lang} />
                  {isFeatured && (
                    <Sparkles
                      className="absolute end-3 top-3 h-3.5 w-3.5 opacity-90"
                      aria-label={cropFieldLabels[lang].featured}
                    />
                  )}
                </button>
              );
            })}
          </aside>

          <div ref={detailRef} className="order-2 md:order-1">
            <CropFeatureCard
              crop={active}
              lang={lang}
              fallbackTextColor={palette.textColor}
              onOpen={() => setModal(active)}
            />
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

export default CropsTemplatePureShelf;

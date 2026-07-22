import { useEffect, useRef, useState } from "react";
import type { Crop, MenuSettings } from "@/types/domain";
import CropCarouselCard from "@/components/menu/crop/CropCarouselCard";
import { MenuCropsTopChrome } from "@/components/menu/MenuCropsTopChrome";
import { useMenuLang } from "@/context/MenuLangContext";
import { useMenuKioskSync } from "@/hooks/useMenuKioskSync";
import { getCropsHeaderCustomization, isCropsLangToggleEnabled } from "@/lib/menu-header-settings";
import { getCropsPalette, palettePageStyle } from "@/lib/menu-palette";
import { menuContentEnter } from "@/lib/menu-header";
import { cn } from "@/lib/utils";

const CROP_CARD_ASPECT = 3 / 4;
const CROP_TRACK_VERTICAL_PAD = 12;

/**
 * Crops Template — عرض أفقي بطاقات (بدون نافذة تفاصيل).
 */
const CropsTemplateMolo = ({ settings, crops }: { settings: MenuSettings; crops: Crop[] }) => {
  const { lang, toggleLang } = useMenuLang();
  const trackRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const cropsHeader = getCropsHeaderCustomization(settings);
  const showLang = isCropsLangToggleEnabled(settings);
  const hideHeader = cropsHeader.hideHeader === true;
  const headerVisible = true;

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const measure = () => {
      const h = el.clientHeight;
      if (h <= 0) return;
      const style = getComputedStyle(el);
      const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      setCardHeight(Math.floor(h - pad));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [hideHeader, headerVisible]);

  const ordered = settings.featuredCropId
    ? [
        ...crops.filter((c) => c.id === settings.featuredCropId),
        ...crops.filter((c) => c.id !== settings.featuredCropId),
      ]
    : crops;

  const palette = getCropsPalette(settings);
  const bgStyle = palettePageStyle(palette);
  const cardWidth = cardHeight > 0 ? Math.round(cardHeight * CROP_CARD_ASPECT) : undefined;

  useMenuKioskSync(true);

  return (
    <div
      className={cn("relative flex h-full min-h-0 flex-col overflow-hidden", menuContentEnter)}
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={bgStyle}
      key={lang}
    >
      <MenuCropsTopChrome
        settings={settings}
        lang={lang}
        visible={headerVisible}
        hideHeader={hideHeader}
        showLang={!hideHeader && showLang}
        showLangInCompactBar={hideHeader && showLang}
        onLangToggle={toggleLang}
        scrollAxis="horizontal"
        layoutMode="panel"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 md:px-5 md:pt-2 ipad-lg:px-6">
          <div
            ref={trackRef}
            className="flex min-h-0 flex-1 items-stretch overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ paddingBlock: CROP_TRACK_VERTICAL_PAD }}
          >
            <div
              className={cn(
                "flex h-full min-h-0 items-stretch gap-3 md:gap-4",
                lang === "ar" ? "flex-row-reverse" : "flex-row",
              )}
            >
              {ordered.map((c) => (
                <CropCarouselCard
                  key={c.id}
                  crop={c}
                  lang={lang}
                  accentColor={palette.accentColor}
                  fallbackTextColor={palette.textColor}
                  featured={c.id === settings.featuredCropId}
                  cardHeight={cardHeight}
                  cardWidth={cardWidth}
                />
              ))}
            </div>
          </div>
        </div>
      </MenuCropsTopChrome>
    </div>
  );
};

export default CropsTemplateMolo;

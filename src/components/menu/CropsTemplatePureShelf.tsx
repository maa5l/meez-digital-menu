import { useEffect, useRef, useState } from "react";
import type { Crop, MenuSettings } from "@/types/domain";
import CropCenteredCard from "@/components/menu/crop/CropCenteredCard";
import { CropListItemLabel } from "@/components/menu/CropDisplay";
import { MenuCropsTopChrome } from "@/components/menu/MenuCropsTopChrome";
import { useMenuLang } from "@/context/MenuLangContext";
import { useMenuKioskSync } from "@/hooks/useMenuKioskSync";
import { getCropsHeaderCustomization, isCropsLangToggleEnabled } from "@/lib/menu-header-settings";
import { getCropsPalette, palettePageStyle } from "@/lib/menu-palette";
import { menuContentEnter } from "@/lib/menu-header";
import { cn } from "@/lib/utils";

/** تمرير تلقائي بين المحاصيل — لهذه الشاشة فقط */
const CROP_AUTO_ADVANCE_MS = 10_000;

/**
 * Crops Template — قائمة جانبية + معاينة بصورة كاملة (بدون نافذة تفاصيل منبثقة).
 */
const CropsTemplatePureShelf = ({ settings, crops }: { settings: MenuSettings; crops: Crop[] }) => {
  const { lang, toggleLang } = useMenuLang();
  const cropsHeader = getCropsHeaderCustomization(settings);
  const showLang = isCropsLangToggleEnabled(settings);
  const hideHeader = cropsHeader.hideHeader === true;
  const listRef = useRef<HTMLDivElement>(null);

  const initial = crops.find((c) => c.id === settings.featuredCropId) || crops[0]!;
  const [active, setActive] = useState<Crop>(initial);
  const palette = getCropsPalette(settings);
  const pageBg = palettePageStyle(palette);

  useMenuKioskSync(true);

  useEffect(() => {
    if (crops.length === 0) return;
    const next = crops.find((c) => c.id === settings.featuredCropId) || crops[0];
    if (!next) return;
    setActive((prev) => (crops.some((c) => c.id === prev.id) ? prev : next));
  }, [crops, settings.featuredCropId]);

  // تمرير تلقائي كل 10 ثوانٍ
  useEffect(() => {
    if (crops.length < 2) return;

    const id = window.setInterval(() => {
      setActive((prev) => {
        const idx = crops.findIndex((c) => c.id === prev.id);
        const next = crops[(idx + 1) % crops.length];
        return next ?? prev;
      });
    }, CROP_AUTO_ADVANCE_MS);

    return () => window.clearInterval(id);
  }, [crops]);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-crop-id="${active.id}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active.id]);

  return (
    <div
      className={cn("relative flex h-full min-h-0 flex-col overflow-hidden", menuContentEnter)}
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={pageBg}
      key={lang}
    >
      <MenuCropsTopChrome
        settings={settings}
        lang={lang}
        visible
        hideHeader={hideHeader}
        showLang={!hideHeader && showLang}
        showLangInCompactBar={hideHeader && showLang}
        onLangToggle={toggleLang}
        layoutMode="panel"
      >
        <div
          className={cn(
            "grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-[minmax(200px,28%)_1fr] md:items-stretch md:gap-4 md:p-4 ipad-lg:grid-cols-[minmax(220px,26%)_1fr] ipad-lg:p-5",
            menuContentEnter,
          )}
        >
          <aside
            ref={listRef}
            className="order-2 flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-y-contain md:order-1"
          >
            {crops.map((c) => {
              const isActive = c.id === active.id;
              const isFeatured = c.id === settings.featuredCropId;
              return (
                <button
                  key={c.id}
                  type="button"
                  data-crop-id={c.id}
                  onClick={() => setActive(c)}
                  className={cn(
                    "w-full rounded-2xl px-4 py-3.5 text-start transition-all touch-manipulation",
                    "ring-1 ring-black/[0.04]",
                    isActive ? "shadow-md" : "bg-white/60 hover:bg-white/90",
                  )}
                  style={{
                    background: isActive ? palette.accentColor : undefined,
                    color: isActive ? "#fff" : palette.textColor,
                    boxShadow: isActive ? `0 4px 20px ${palette.accentColor}35` : undefined,
                  }}
                >
                  <CropListItemLabel
                    crop={c}
                    lang={lang}
                    accentColor={palette.accentColor}
                    active={isActive}
                    featured={isFeatured}
                  />
                </button>
              );
            })}
          </aside>

          <div className="order-1 min-h-0 overflow-hidden rounded-[1.75rem] md:order-2">
            <CropCenteredCard
              key={active.id}
              crop={active}
              lang={lang}
              accentColor={palette.accentColor}
              fallbackTextColor={palette.textColor}
              featured={active.id === settings.featuredCropId}
              variant="feature"
              scrollable
              className="h-full min-h-0 w-full shadow-lg"
            />
          </div>
        </div>
      </MenuCropsTopChrome>
    </div>
  );
};

export default CropsTemplatePureShelf;

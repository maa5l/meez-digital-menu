import { useEffect, useState } from "react";
import type { Crop, MenuSettings } from "@/types/domain";
import CropDetailModal from "@/components/menu/CropDetailModal";
import CropHeroImage from "@/components/menu/crop/CropHeroImage";
import { CropListItemLabel } from "@/components/menu/CropDisplay";
import { MenuCropsTopChrome } from "@/components/menu/MenuCropsTopChrome";
import { useMenuLang } from "@/context/MenuLangContext";
import { useMenuKioskSync } from "@/hooks/useMenuKioskSync";
import { buildCropProfile } from "@/lib/crop-profile";
import { getCropsHeaderCustomization, isCropsLangToggleEnabled } from "@/lib/menu-header-settings";
import { getCropsPalette, palettePageStyle } from "@/lib/menu-palette";
import { menuContentEnter } from "@/lib/menu-header";
import { cn } from "@/lib/utils";

/**
 * Crops Template — قائمة جانبية + معاينة مختصرة؛ التفاصيل الكاملة في نافذة منبثقة.
 */
const CropsTemplatePureShelf = ({ settings, crops }: { settings: MenuSettings; crops: Crop[] }) => {
  const { lang, toggleLang } = useMenuLang();
  const [modal, setModal] = useState<Crop | null>(null);
  const cropsHeader = getCropsHeaderCustomization(settings);
  const showLang = isCropsLangToggleEnabled(settings);
  const hideHeader = cropsHeader.hideHeader === true;

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

  useEffect(() => {
    if (!modal) return;
    const fresh = crops.find((c) => c.id === modal.id);
    if (fresh) setModal(fresh);
  }, [crops, modal]);

  const profile = buildCropProfile(active, lang);

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
          <aside className="order-2 flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-y-contain md:order-1">
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

          <div className="order-1 min-h-0 overflow-hidden md:order-2">
            <button
              type="button"
              onClick={() => setModal(active)}
              className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.75rem] bg-white/70 text-start shadow-lg ring-1 ring-black/[0.05] touch-manipulation transition-transform active:scale-[0.995]"
            >
              <CropHeroImage
                imageUrl={active.image}
                alt={profile.localized.beanName}
                lang={lang}
                className="max-h-[58%] shrink-0 rounded-none"
              />
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-5 py-4 text-center">
                <h2
                  className="font-display text-2xl font-black leading-tight md:text-3xl"
                  style={{ color: palette.textColor }}
                  dir={lang === "ar" ? "rtl" : "ltr"}
                >
                  {profile.localized.beanName}
                </h2>
                <p className="text-sm font-semibold opacity-60" style={{ color: palette.textColor }}>
                  {lang === "ar" ? "اضغط لعرض التفاصيل" : "Tap for details"}
                </p>
              </div>
            </button>
          </div>
        </div>
      </MenuCropsTopChrome>

      {modal && (
        <CropDetailModal
          crop={modal}
          lang={lang}
          accent={palette.accentColor}
          fallbackTextColor={palette.textColor}
          featured={modal.id === settings.featuredCropId}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default CropsTemplatePureShelf;

import { UtensilsCrossed, Sprout } from "lucide-react";
import type { MenuSettings } from "@/types/domain";
import MenuCropsHeader from "@/components/menu/MenuCropsHeader";
import MenuLangToggle from "@/components/menu/MenuLangToggle";
import MenuProductHeader from "@/components/menu/MenuProductHeader";
import { useMenuLang } from "@/context/MenuLangContext";
import { getMenuUi } from "@/lib/menu-i18n";
import {
  getCropsHeaderCustomization,
  getProductsHeaderCustomization,
  isCropsLangToggleEnabled,
  isProductsLangToggleEnabled,
} from "@/lib/menu-header-settings";
import { getCropsPalette, getProductsPalette } from "@/lib/menu-palette";

type Props = {
  settings: MenuSettings;
  type: "products" | "crops";
};

const MenuEmptyState = ({ settings, type }: Props) => {
  const { lang, toggleLang } = useMenuLang();
  const isCrops = type === "crops";
  const palette = isCrops ? getCropsPalette(settings) : getProductsPalette(settings);
  const headerCustomization = isCrops
    ? getCropsHeaderCustomization(settings)
    : getProductsHeaderCustomization(settings);
  const showLang = isCrops ? isCropsLangToggleEnabled(settings) : isProductsLangToggleEnabled(settings);
  const hideHeader = headerCustomization.hideHeader === true;
  const ui = getMenuUi(lang);

  return (
    <div
      className="relative flex-1 flex flex-col min-h-0"
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={{ color: palette.textColor, background: palette.bgColor }}
    >
      {isCrops ? (
        <MenuCropsHeader settings={settings} lang={lang} embedded />
      ) : (
        <MenuProductHeader settings={settings} lang={lang} embedded />
      )}

      {showLang && !hideHeader && (
        <div className="shrink-0 px-5 py-2 md:px-10" dir="ltr">
          <MenuLangToggle lang={lang} textColor={palette.textColor} onToggle={toggleLang} />
        </div>
      )}

      {showLang && hideHeader && (
        <div className="absolute top-3 end-3 z-10 md:top-4 md:end-6" dir="ltr">
          <MenuLangToggle lang={lang} textColor={palette.textColor} onToggle={toggleLang} />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: `${palette.accentColor}22` }}
        >
          {isCrops ? (
            <Sprout className="w-10 h-10" style={{ color: palette.accentColor }} />
          ) : (
            <UtensilsCrossed className="w-10 h-10" style={{ color: palette.accentColor }} />
          )}
        </div>
        <h2 className="font-display font-black text-2xl mb-2">
          {isCrops ? ui.emptyCropsTitle : ui.emptyProductsTitle}
        </h2>
        <p className="text-sm opacity-60 max-w-sm">
          {isCrops ? ui.emptyCropsHint : ui.emptyProductsHint}
        </p>
      </div>
    </div>
  );
};

export default MenuEmptyState;

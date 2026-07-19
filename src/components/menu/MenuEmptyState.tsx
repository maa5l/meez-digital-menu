import { UtensilsCrossed, Sprout } from "lucide-react";
import type { MenuSettings } from "@/types/domain";
import MenuCropsHeader from "@/components/menu/MenuCropsHeader";
import MenuLangToggle from "@/components/menu/MenuLangToggle";
import MenuProductHeader from "@/components/menu/MenuProductHeader";
import { UserErrorPanel } from "@/components/UserErrorPanel";
import { useMenuLang } from "@/context/MenuLangContext";
import { emptyMenuNotice } from "@/lib/user-facing-errors";
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
  const emptyError = emptyMenuNotice();

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={{ color: palette.textColor, background: palette.bgColor }}
    >
      {!hideHeader &&
        (isCrops ? (
          <MenuCropsHeader settings={settings} lang={lang} embedded />
        ) : (
          <MenuProductHeader settings={settings} lang={lang} embedded />
        ))}

      {showLang && !hideHeader && (
        <div className="shrink-0 px-5 py-2 md:px-10" dir="ltr">
          <MenuLangToggle lang={lang} textColor={palette.textColor} onToggle={toggleLang} />
        </div>
      )}

      {showLang && hideHeader && (
        <div className="absolute end-3 top-3 z-10 md:end-6 md:top-4" dir="ltr">
          <MenuLangToggle lang={lang} textColor={palette.textColor} onToggle={toggleLang} />
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <UserErrorPanel
          error={{
            ...emptyError,
            title: isCrops ? "لا توجد محاصيل" : emptyError.title,
            message: isCrops
              ? "لا توجد محاصيل لعرضها حاليًا. أضف المحاصيل من لوحة التحكم."
              : emptyError.message,
          }}
          className="text-inherit"
        />
        <div
          className="mt-2 flex h-16 w-16 items-center justify-center rounded-3xl opacity-40"
          style={{ background: `${palette.accentColor}22` }}
          aria-hidden
        >
          {isCrops ? (
            <Sprout className="h-8 w-8" style={{ color: palette.accentColor }} />
          ) : (
            <UtensilsCrossed className="h-8 w-8" style={{ color: palette.accentColor }} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuEmptyState;

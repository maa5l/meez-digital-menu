import MenuCropsHeader from "@/components/menu/MenuCropsHeader";
import MenuFixedCalorieBar from "@/components/menu/MenuFixedCalorieBar";
import { MenuProductSubheaderBar } from "@/components/menu/MenuProductTopChrome";
import { useMenuLayoutMetrics } from "@/hooks/useMenuLayoutMetrics";
import {
  getCalorieDisclaimerColor,
  getMenuScrollPaddingTop,
  getMenuSubheaderTop,
  headerHideTransition,
} from "@/lib/menu-header";
import { getCropsHeaderCustomization } from "@/lib/menu-header-settings";
import { getCropsPalette } from "@/lib/menu-palette";
import { cn } from "@/lib/utils";
import type { MenuSettings } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";

type Props = {
  settings: MenuSettings;
  lang: MenuLang;
  visible: boolean;
  hideHeader?: boolean;
  showLangInCompactBar?: boolean;
  onLangToggle?: () => void;
  subheader?: React.ReactNode;
  children: React.ReactNode;
  scrollRef: React.Ref<HTMLDivElement>;
};

/** هيدر ثابت لمنيو المحاصيل + شريط فرعي (مثل المنتجات) */
export function MenuCropsTopChrome({
  settings,
  lang,
  visible,
  hideHeader = false,
  showLangInCompactBar = false,
  onLangToggle,
  subheader,
  children,
  scrollRef,
}: Props) {
  const layout = useMenuLayoutMetrics();
  const hasSubheader = Boolean(subheader);
  const scrollPaddingTop = getMenuScrollPaddingTop(hasSubheader, visible, hideHeader, layout);
  const subheaderTop = getMenuSubheaderTop(visible, hideHeader, layout);
  const headerCustomization = getCropsHeaderCustomization(settings);
  const palette = getCropsPalette(settings);
  const calorieColor = getCalorieDisclaimerColor(headerCustomization, palette.textColor);
  const headerFg = headerCustomization.headerTextColor ?? palette.textColor;

  return (
    <>
      {hideHeader ? (
        <MenuFixedCalorieBar
          lang={lang}
          textColor={calorieColor}
          headerFg={headerFg}
          customization={headerCustomization}
          showLang={showLangInCompactBar}
          onLangToggle={onLangToggle}
        />
      ) : (
        <MenuCropsHeader settings={settings} lang={lang} visible={visible} />
      )}

      {hasSubheader && (
        <div
          className={cn("fixed inset-x-0 z-[45]", headerHideTransition)}
          style={{ top: subheaderTop }}
        >
          <MenuProductSubheaderBar settings={settings}>{subheader}</MenuProductSubheaderBar>
        </div>
      )}

      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y min-h-0",
          headerHideTransition,
        )}
        style={{
          paddingTop: scrollPaddingTop,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {children}
      </div>
    </>
  );
}

export { MENU_SUBHEADER_HEIGHT } from "@/lib/menu-header";

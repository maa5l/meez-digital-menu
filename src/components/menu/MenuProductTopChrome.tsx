import MenuProductHeader from "@/components/menu/MenuProductHeader";
import MenuFixedCalorieBar from "@/components/menu/MenuFixedCalorieBar";
import { useMenuLayoutMetrics } from "@/hooks/useMenuLayoutMetrics";
import {
  getCalorieDisclaimerColor,
  getMenuScrollPaddingTop,
  getMenuSubheaderTop,
  headerHideTransition,
  menuChromeMotion,
} from "@/lib/menu-header";
import { getProductsHeaderCustomization } from "@/lib/menu-header-settings";
import { getProductsPalette } from "@/lib/menu-palette";
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

/** هيدر ثابت + تصنيفات/لغة مثبتة تحته مباشرة */
export function MenuProductTopChrome({
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
  const headerCustomization = getProductsHeaderCustomization(settings);
  const palette = getProductsPalette(settings);
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
        <MenuProductHeader settings={settings} lang={lang} visible={visible} />
      )}

      {hasSubheader && (
        <div
          className={cn("fixed inset-x-0 z-[45]", headerHideTransition, menuChromeMotion)}
          style={{ top: subheaderTop }}
        >
          <MenuProductSubheaderBar settings={settings}>{subheader}</MenuProductSubheaderBar>
        </div>
      )}

      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain",
          headerHideTransition,
          menuChromeMotion,
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

/** شريط التصنيفات واللغة — شفاف، تحت الهيدر */
export function MenuProductSubheaderBar({
  settings: _settings,
  children,
}: {
  settings: MenuSettings;
  children: React.ReactNode;
}) {
  const layout = useMenuLayoutMetrics();

  return (
    <div
      className="bg-transparent px-4 py-1.5 md:px-8 md:py-2"
      style={{ minHeight: layout.subheaderHeight }}
      dir="ltr"
    >
      {children}
    </div>
  );
}

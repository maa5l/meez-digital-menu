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
  scrollRef?: React.Ref<HTMLDivElement>;
  /** panel = ملء الشاشة بدون تمرير عمودي للصفحة (قائمة + تفاصيل) */
  layoutMode?: "scroll" | "panel";
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
  layoutMode = "scroll",
}: Props) {
  const layout = useMenuLayoutMetrics();
  const hasSubheader = Boolean(subheader);
  const scrollPaddingTop = getMenuScrollPaddingTop(
    hasSubheader,
    visible,
    hideHeader,
    layout,
    showLangInCompactBar,
  );
  const subheaderTop = getMenuSubheaderTop(visible, hideHeader, layout, showLangInCompactBar);
  const headerCustomization = getProductsHeaderCustomization(settings);
  const palette = getProductsPalette(settings);
  const calorieColor = getCalorieDisclaimerColor(headerCustomization, palette.textColor);
  const headerFg = headerCustomization.headerTextColor ?? palette.textColor;
  const panelFlow = layoutMode === "panel";

  const headerNode = hideHeader ? (
    showLangInCompactBar ? (
      <MenuFixedCalorieBar
        lang={lang}
        textColor={calorieColor}
        headerFg={headerFg}
        customization={headerCustomization}
        showLang
        onLangToggle={onLangToggle}
        embedded={panelFlow}
        variant="lang-only"
      />
    ) : null
  ) : (
    <MenuProductHeader
      settings={settings}
      lang={lang}
      visible={visible}
      embedded={panelFlow}
    />
  );

  const subheaderNode = hasSubheader ? (
    <MenuProductSubheaderBar settings={settings}>{subheader}</MenuProductSubheaderBar>
  ) : null;

  const contentNode = (
    <div
      ref={scrollRef}
      className={cn(
        "min-h-0 flex-1",
        headerHideTransition,
        menuChromeMotion,
        panelFlow
          ? "flex h-0 flex-col overflow-hidden"
          : "touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain",
      )}
      style={{
        paddingTop: panelFlow ? undefined : scrollPaddingTop,
        WebkitOverflowScrolling: panelFlow ? undefined : "touch",
      }}
    >
      {children}
    </div>
  );

  if (panelFlow) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {headerNode}
        {subheaderNode && <div className="relative z-[45] shrink-0">{subheaderNode}</div>}
        {contentNode}
      </div>
    );
  }

  return (
    <>
      {headerNode}
      {subheaderNode && (
        <div
          className={cn("fixed inset-x-0 z-[45]", headerHideTransition, menuChromeMotion)}
          style={{ top: subheaderTop }}
        >
          {subheaderNode}
        </div>
      )}
      {contentNode}
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

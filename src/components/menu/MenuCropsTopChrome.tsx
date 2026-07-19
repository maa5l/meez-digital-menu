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
  showLang?: boolean;
  showLangInCompactBar?: boolean;
  onLangToggle?: () => void;
  subheader?: React.ReactNode;
  children: React.ReactNode;
  scrollRef?: React.Ref<HTMLDivElement>;
  /** أفقي = بطاقات بالعرض بدون تمرير عمودي */
  scrollAxis?: "vertical" | "horizontal";
  /** panel = ملء الشاشة تحت الهيدر بدون تمرير الصفحة */
  layoutMode?: "scroll" | "panel";
};

/** هيدر ثابت لمنيو المحاصيل + شريط فرعي (مثل المنتجات) */
export function MenuCropsTopChrome({
  settings,
  lang,
  visible,
  hideHeader = false,
  showLang = false,
  showLangInCompactBar = false,
  onLangToggle,
  subheader,
  children,
  scrollRef,
  scrollAxis = "vertical",
  layoutMode = "scroll",
}: Props) {
  const layout = useMenuLayoutMetrics();
  const hasSubheader = Boolean(subheader);
  const headerCustomization = getCropsHeaderCustomization(settings);
  const scrollPaddingTop = getMenuScrollPaddingTop(
    hasSubheader,
    visible,
    hideHeader,
    layout,
    showLangInCompactBar,
    headerCustomization,
  );
  const subheaderTop = getMenuSubheaderTop(visible, hideHeader, layout, showLangInCompactBar, headerCustomization);
  const palette = getCropsPalette(settings);
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
    <MenuCropsHeader
      settings={settings}
      lang={lang}
      visible={visible}
      embedded={panelFlow}
      showLang={showLang}
      onLangToggle={onLangToggle}
    />
  );

  const subheaderNode = hasSubheader ? (
    <MenuProductSubheaderBar settings={settings}>{subheader}</MenuProductSubheaderBar>
  ) : null;

  const contentNode = (
    <div
      ref={scrollRef}
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        (panelFlow || scrollAxis === "horizontal") && "h-0 overflow-hidden",
        scrollAxis === "horizontal" && "touch-pan-x",
        headerHideTransition,
        layoutMode === "scroll" &&
          scrollAxis !== "horizontal" &&
          "touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain",
      )}
      style={{
        paddingTop: panelFlow ? undefined : scrollPaddingTop,
        WebkitOverflowScrolling:
          panelFlow || scrollAxis === "horizontal" ? undefined : "touch",
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
          className={cn("fixed inset-x-0 z-[45]", headerHideTransition)}
          style={{ top: subheaderTop }}
        >
          {subheaderNode}
        </div>
      )}
      {contentNode}
    </>
  );
}

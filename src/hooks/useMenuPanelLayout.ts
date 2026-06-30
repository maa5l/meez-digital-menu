import { useMenuLayoutMetrics } from "@/hooks/useMenuLayoutMetrics";
import { getMenuPanelContentHeight, getMenuScrollPaddingTop } from "@/lib/menu-header";

/** مقاسات منطقة المحتوى — مُحسَّنة لملء شاشة الآيباد */
export function useMenuPanelLayout(
  headerVisible: boolean,
  hideHeader: boolean,
  hasSubheader = false,
) {
  const layout = useMenuLayoutMetrics();
  const scrollPaddingTop = getMenuScrollPaddingTop(
    hasSubheader,
    headerVisible,
    hideHeader,
    layout,
  );
  const contentHeight = getMenuPanelContentHeight(scrollPaddingTop);

  return { layout, scrollPaddingTop, contentHeight };
}

/** @deprecated استخدم useMenuPanelLayout */
export const useMenuCropsLayout = useMenuPanelLayout;

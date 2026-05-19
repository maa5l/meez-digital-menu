import MenuProductHeader, { headerHideTransition } from "@/components/menu/MenuProductHeader";
import {
  getMenuProductHeaderHeight,
  getMenuTopChromeHeight,
  MENU_SUBHEADER_HEIGHT,
} from "@/lib/menu-header";
import { cn } from "@/lib/utils";
import type { MenuSettings } from "@/types/domain";

type Props = {
  settings: MenuSettings;
  lang: "ar" | "en";
  visible: boolean;
  subheader?: React.ReactNode;
  children: React.ReactNode;
  scrollRef: React.Ref<HTMLDivElement>;
};

/** هيدر ثابت + تصنيفات/لغة مثبتة تحته مباشرة */
export function MenuProductTopChrome({
  settings,
  lang,
  visible,
  subheader,
  children,
  scrollRef,
}: Props) {
  const headerH = getMenuProductHeaderHeight(settings);
  const hasSubheader = Boolean(subheader);
  const chromeHeight = getMenuTopChromeHeight(hasSubheader);

  return (
    <>
      <MenuProductHeader settings={settings} lang={lang} visible={visible} />

      {hasSubheader && (
        <div
          className={cn(
            "fixed inset-x-0 z-30",
            headerHideTransition,
            visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none",
          )}
          style={{ top: headerH }}
        >
          <MenuProductSubheaderBar settings={settings}>{subheader}</MenuProductSubheaderBar>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y min-h-0"
        style={{
          paddingTop: chromeHeight,
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
  return (
    <div
      className="bg-transparent px-5 py-2 md:px-10 md:py-2.5"
      style={{ minHeight: MENU_SUBHEADER_HEIGHT }}
    >
      {children}
    </div>
  );
}

import MenuHeaderChromeRow from "@/components/menu/MenuHeaderChromeRow";
import MenuLangToggle from "@/components/menu/MenuLangToggle";
import { MENU_COMPACT_TOP_HEIGHT, menuChromeMotion } from "@/lib/menu-header";
import type { MenuHeaderCustomization } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";

type Props = {
  lang: MenuLang;
  textColor: string;
  headerFg: string;
  customization: MenuHeaderCustomization;
  showLang?: boolean;
  onLangToggle?: () => void;
};

/** شريط علوي مدمج — إفصاح السعرات + الشعار في صف واحد */
const MenuFixedCalorieBar = ({
  lang,
  textColor,
  headerFg,
  customization,
  showLang = false,
  onLangToggle,
}: Props) => (
  <div
    className={cn(
      "fixed inset-x-0 top-0 z-40 border-b border-black/10 bg-black/[0.04]",
      menuChromeMotion,
    )}
    style={{ minHeight: MENU_COMPACT_TOP_HEIGHT }}
  >
    <div className="relative px-3 py-2 md:px-6 md:py-2.5">
      <MenuHeaderChromeRow
        lang={lang}
        textColor={textColor}
        headerFg={headerFg}
        customization={customization}
      />
      {showLang && onLangToggle && (
        <MenuLangToggle
          lang={lang}
          onToggle={onLangToggle}
          textColor={textColor}
          className="absolute end-2 top-2 md:end-4"
        />
      )}
    </div>
  </div>
);

export default MenuFixedCalorieBar;

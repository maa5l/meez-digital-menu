import MenuHeaderChromeRow from "@/components/menu/MenuHeaderChromeRow";
import MenuLangToggle from "@/components/menu/MenuLangToggle";
import { useMenuLayoutMetrics } from "@/hooks/useMenuLayoutMetrics";
import { menuChromeMotion } from "@/lib/menu-header";
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
}: Props) => {
  const layout = useMenuLayoutMetrics();

  return (
  <div
    className={cn(
      "fixed inset-x-0 top-0 z-40 border-b border-black/10 bg-black/[0.04]",
      menuChromeMotion,
    )}
    style={{ minHeight: layout.compactTopHeight }}
  >
    <div className="relative px-3 py-1.5 md:px-5 md:py-2">
      <MenuHeaderChromeRow
        lang={lang}
        textColor={textColor}
        headerFg={headerFg}
        customization={customization}
        logoSizePx={layout.logoSizePx}
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
};

export default MenuFixedCalorieBar;

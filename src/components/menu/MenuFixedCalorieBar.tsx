import { Logo } from "@/components/Brand";
import MenuCalorieDisclaimer from "@/components/menu/MenuCalorieDisclaimer";
import MenuLangToggle from "@/components/menu/MenuLangToggle";
import { MENU_COMPACT_TOP_HEIGHT } from "@/lib/menu-header";
import type { MenuHeaderCustomization } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";

type Props = {
  lang: MenuLang;
  textColor: string;
  headerFg: string;
  customization: MenuHeaderCustomization;
  showLang?: boolean;
  onLangToggle?: () => void;
};

/** شريط علوي مدمج — إفصاح السعرات + الشعار + زر اللغة عند إخفاء الهيدر */
const MenuFixedCalorieBar = ({
  lang,
  textColor,
  headerFg,
  customization,
  showLang = false,
  onLangToggle,
}: Props) => (
  <div
    className="fixed inset-x-0 top-0 z-40 flex flex-col border-b border-black/10 bg-black/[0.04]"
    style={{ minHeight: MENU_COMPACT_TOP_HEIGHT }}
  >
    <div className="shrink-0 px-3 py-1 md:px-6">
      <MenuCalorieDisclaimer lang={lang} textColor={textColor} merged />
    </div>
    <div className="relative flex shrink-0 items-center justify-center px-3 pb-1.5 pt-0.5 md:px-6 md:pb-2">
      {customization.logoImage ? (
        <img
          src={customization.logoImage}
          alt="logo"
          className="h-7 w-auto max-w-[100px] object-contain md:h-9 md:max-w-[130px]"
        />
      ) : (
        <span style={{ color: headerFg }}>
          <Logo className="h-7 w-auto aspect-[1031/736] md:h-9" />
        </span>
      )}
      {showLang && onLangToggle && (
        <MenuLangToggle
          lang={lang}
          onToggle={onLangToggle}
          textColor={textColor}
          className="absolute end-3 top-1/2 -translate-y-1/2 md:end-6"
        />
      )}
    </div>
  </div>
);

export default MenuFixedCalorieBar;

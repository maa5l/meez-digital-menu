import MenuVenueHeader from "@/components/menu/MenuVenueHeader";
import MenuLangToggle from "@/components/menu/MenuLangToggle";
import { getCalorieDisclaimerColor } from "@/lib/menu-header";
import { getCropsHeaderCustomization } from "@/lib/menu-header-settings";
import { getCropsPalette } from "@/lib/menu-palette";
import type { MenuSettings } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";

type Props = {
  settings: MenuSettings;
  lang: "ar" | "en";
  embedded?: boolean;
  visible?: boolean;
  showLang?: boolean;
  onLangToggle?: () => void;
};

const MenuCropsHeader = ({
  settings,
  lang,
  embedded = false,
  visible = true,
  showLang = false,
  onLangToggle,
}: Props) => {
  const customization = getCropsHeaderCustomization(settings);
  const palette = getCropsPalette(settings);
  const bannerSrc = customization.headerImage || customization.featuredImage;
  const headerFg = customization.headerTextColor ?? palette.textColor;
  const calorieFallback = bannerSrc ? "#ffffff" : headerFg;
  const langColor = getCalorieDisclaimerColor(customization, calorieFallback);

  return (
    <MenuVenueHeader
      customization={customization}
      palette={palette}
      lang={lang}
      defaultTitleAr="محصول الشهر"
      defaultTitleEn="Crop of the Month"
      embedded={embedded}
      visible={visible}
      chromeTrailing={
        showLang && onLangToggle ? (
          <MenuLangToggle
            lang={lang}
            onToggle={onLangToggle}
            textColor={langColor}
            variant="tab"
            className="px-2.5 py-1 text-[11px] md:px-3 md:py-1.5 md:text-xs"
          />
        ) : undefined
      }
    />
  );
};

export default MenuCropsHeader;

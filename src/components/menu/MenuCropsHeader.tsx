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
      chromeBottomLeft={
        showLang && onLangToggle ? (
          <MenuLangToggle
            lang={lang}
            onToggle={onLangToggle}
            textColor={bannerSrc ? "#ffffff" : langColor}
            className="border-white/40 bg-black/40 px-3 py-1.5 text-xs backdrop-blur-sm md:px-4 md:text-sm"
          />
        ) : undefined
      }
    />
  );
};

export default MenuCropsHeader;

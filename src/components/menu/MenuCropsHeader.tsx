import MenuVenueHeader from "@/components/menu/MenuVenueHeader";
import { getCropsHeaderCustomization } from "@/lib/menu-header-settings";
import { getCropsPalette } from "@/lib/menu-palette";
import type { MenuSettings } from "@/types/domain";

export {
  getMenuProductHeaderHeight,
  getMenuTopChromeHeight,
  MENU_PRODUCT_HEADER_HEIGHT,
  MENU_SUBHEADER_HEIGHT,
  headerHideTransition,
} from "@/components/menu/MenuVenueHeader";

type Props = {
  settings: MenuSettings;
  lang: "ar" | "en";
  embedded?: boolean;
  visible?: boolean;
};

const MenuCropsHeader = ({ settings, lang, embedded = false, visible = true }: Props) => (
  <MenuVenueHeader
    customization={getCropsHeaderCustomization(settings)}
    palette={getCropsPalette(settings)}
    lang={lang}
    defaultTitleAr="محصول الشهر"
    defaultTitleEn="Crop of the Month"
    embedded={embedded}
    visible={visible}
  />
);

export default MenuCropsHeader;

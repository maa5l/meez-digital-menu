import MenuVenueHeader from "@/components/menu/MenuVenueHeader";
import { getProductsHeaderCustomization } from "@/lib/menu-header-settings";
import { getProductsPalette } from "@/lib/menu-palette";
import type { MenuSettings } from "@/types/domain";

type Props = {
  settings: MenuSettings;
  lang: "ar" | "en";
  embedded?: boolean;
  visible?: boolean;
};

const MenuProductHeader = ({
  settings,
  lang,
  embedded = false,
  visible = true,
}: Props) => (
  <MenuVenueHeader
    customization={getProductsHeaderCustomization(settings)}
    palette={getProductsPalette(settings)}
    lang={lang}
    defaultTitleAr="منتج او مشروب الشهر"
    defaultTitleEn="Product or Drink of the Month"
    embedded={embedded}
    visible={visible}
  />
);

export default MenuProductHeader;

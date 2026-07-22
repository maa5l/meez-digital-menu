import CropCenteredCard from "@/components/menu/crop/CropCenteredCard";
import type { Crop } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";

type Props = {
  crop: Crop;
  lang: MenuLang;
  accentColor: string;
  fallbackTextColor: string;
  featured?: boolean;
  cardHeight?: number;
  cardWidth?: number;
  onClick?: () => void;
};

/** بطاقة محصول للعرض الأفقي — مقاسها يتبع ارتفاع المساحة المتاحة */
const CropCarouselCard = ({
  crop,
  lang,
  accentColor,
  fallbackTextColor,
  featured,
  cardHeight,
  cardWidth,
  onClick,
}: Props) => (
  <CropCenteredCard
    crop={crop}
    lang={lang}
    accentColor={accentColor}
    fallbackTextColor={fallbackTextColor}
    featured={featured}
    variant="carousel"
    onClick={onClick}
    className="h-full max-h-full shrink-0 snap-center overflow-hidden shadow-lg"
    style={
      cardHeight && cardWidth
        ? { height: cardHeight, width: cardWidth, maxHeight: cardHeight, maxWidth: cardWidth }
        : { height: "100%", maxHeight: "100%", aspectRatio: "3/4", width: "auto" }
    }
  />
);

export default CropCarouselCard;

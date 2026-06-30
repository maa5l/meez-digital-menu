import CropCenteredCard from "@/components/menu/crop/CropCenteredCard";
import type { Crop } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";

type Props = {
  crop: Crop;
  lang: MenuLang;
  accentColor: string;
  fallbackTextColor: string;
  featured?: boolean;
  className?: string;
  onOpen?: () => void;
};

/** بطاقة المحصول الكبيرة — عرض مضمّن في القالب */
const CropFeatureCard = ({
  crop,
  lang,
  accentColor,
  fallbackTextColor,
  featured,
  className,
  onOpen,
}: Props) => (
  <CropCenteredCard
    crop={crop}
    lang={lang}
    accentColor={accentColor}
    fallbackTextColor={fallbackTextColor}
    featured={featured}
    variant="feature"
    onClick={onOpen}
    className={cn("h-full min-h-0 overflow-hidden shadow-lg", className)}
  />
);

export default CropFeatureCard;

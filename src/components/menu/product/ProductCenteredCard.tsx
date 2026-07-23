import { Riyal } from "@/components/Brand";
import AllergenIcons from "@/components/menu/AllergenIcons";
import MenuProductImage from "@/components/menu/MenuProductImage";
import { localizeProduct, type MenuLang } from "@/lib/product-i18n";
import { cropDisplayLine } from "@/lib/crop-info";
import { getProductLandscapeImage, getProductPortraitImage } from "@/lib/product-spec";
import type { Product } from "@/types/domain";
import { cn } from "@/lib/utils";

const labels = {
  ar: {
    name: "الاسم",
    price: "السعر",
    calories: "السعرات",
    allergens: "مسببات الحساسية",
    description: "الوصف",
    crop: "المحصول",
  },
  en: {
    name: "Name",
    price: "Price",
    calories: "Calories",
    allergens: "Allergens",
    description: "Description",
    crop: "Crop",
  },
} as const;

function PriceWithRiyal({
  price,
  className,
  riyalClassName = "shrink-0 opacity-90",
}: {
  price: number | string;
  className?: string;
  riyalClassName?: string;
}) {
  return (
    <span dir="ltr" className={cn("inline-flex max-w-full items-center gap-0.5", className)}>
      <Riyal className={riyalClassName} />
      <span className="truncate">{price}</span>
    </span>
  );
}

function cropSummary(product: Product): string | null {
  return cropDisplayLine(product.cropInfo);
}

type Props = {
  product: Product;
  lang: MenuLang;
  cardBg: string;
  className?: string;
};

/**
 * بطاقة منتج — صورة كاملة بدون نص + تفاصيل مضغوطة تحت الصورة.
 */
const ProductCenteredCard = ({
  product,
  lang,
  cardBg,
  className,
}: Props) => {
  const t = labels[lang];
  const localized = localizeProduct(product, lang);
  const isEn = lang === "en";
  const cropLine = cropSummary(product);
  const heroImage = getProductLandscapeImage(product) || getProductPortraitImage(product);

  const labelCls = "text-[10px] font-bold leading-none opacity-55 md:text-[11px]";
  const valueCls = "mt-0.5 text-sm font-black leading-snug text-[#1a1a1a] md:text-base";

  return (
    <article
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.75rem]",
        className,
      )}
      style={{
        background: cardBg,
        boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
      }}
      aria-label={localized.name}
    >
      {/* صورة — تأخذ المساحة المتبقية */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#1a1a1a]/6">
        {heroImage ? (
          <MenuProductImage
            src={heroImage}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
            placeholder={
              <span className="absolute inset-0 bg-[#1a1a1a]/10" aria-hidden />
            }
          />
        ) : (
          <div className="absolute inset-0 bg-[#1a1a1a]/10" aria-hidden />
        )}
      </div>

      {/* قسم التفاصيل — مضغوط حسب المحتوى */}
      <div
        className="shrink-0 border-t border-black/[0.06]"
        style={{ background: cardBg, color: "#1a1a1a" }}
      >
        <div className="px-3.5 py-2.5 md:px-4 md:py-3">
          <div className="grid grid-cols-2 grid-rows-2 gap-x-3 gap-y-2 md:gap-x-4 md:gap-y-2.5" dir="ltr">
            <div className="col-start-1 row-start-1 min-w-0 text-left">
              <div className={labelCls}>{t.price}</div>
              <div className={valueCls}>
                <PriceWithRiyal price={product.price} riyalClassName="h-3.5 w-3.5 md:h-4 md:w-4" />
              </div>
            </div>

            <div className="col-start-2 row-start-1 min-w-0 text-right">
              <div className={labelCls}>{t.name}</div>
              <div className={cn(valueCls, "line-clamp-2")} dir={lang === "ar" ? "rtl" : "ltr"}>
                {localized.name}
              </div>
            </div>

            <div className="col-start-1 row-start-2 min-w-0 text-left">
              <div className={labelCls}>{t.allergens}</div>
              <div className="mt-0.5">
                <AllergenIcons
                  allergens={product.allergens}
                  allergensEn={product.allergensEn}
                  lang={lang}
                  size="sm"
                  className="justify-start"
                  emptyPlaceholder={<span className="text-sm opacity-40">—</span>}
                />
              </div>
            </div>

            <div className="col-start-2 row-start-2 min-w-0 text-right">
              <div className={labelCls}>{t.calories}</div>
              <div className={valueCls}>{product.calories}</div>
            </div>
          </div>

          {localized.description?.trim() && (
            <div className="mt-2 border-t border-black/10 pt-2">
              <div className={cn(labelCls, isEn ? "text-left" : "text-right")}>{t.description}</div>
              <p
                dir={isEn ? "ltr" : "rtl"}
                className={cn(
                  "mt-0.5 line-clamp-2 text-xs font-semibold leading-snug text-[#1a1a1a]/85 md:text-sm",
                  isEn ? "text-left" : "text-right",
                )}
              >
                {localized.description}
              </p>
            </div>
          )}

          {cropLine && (
            <div className="mt-2 border-t border-black/10 pt-2 text-right">
              <div className={labelCls}>{t.crop}</div>
              <p
                dir="rtl"
                className="mt-0.5 line-clamp-1 text-xs font-semibold leading-snug opacity-85 md:text-sm"
              >
                {cropLine}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProductCenteredCard;

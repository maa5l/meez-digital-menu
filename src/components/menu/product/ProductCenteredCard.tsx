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
 * بطاقة منتج — صورة كاملة بدون نص + تفاصيل تحت الصورة.
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
  const hasCrop = Boolean(cropLine);
  const heroImage = getProductLandscapeImage(product) || getProductPortraitImage(product);

  const labelCls = "text-[11px] font-bold leading-none opacity-55 md:text-xs";
  const valueCls = "mt-1 text-base font-black leading-snug text-[#1a1a1a] md:text-lg";

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
      {/* صورة كاملة — بدون أي نص */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
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

      {/* قسم التفاصيل تحت الصورة */}
      <div
        className={cn(
          "shrink-0 border-t border-black/[0.06]",
          hasCrop
            ? "min-h-[min(52%,320px)] max-h-[min(58%,420px)]"
            : "max-h-[min(44%,260px)] overflow-y-auto overscroll-y-contain",
        )}
        style={{ background: cardBg, color: "#1a1a1a" }}
      >
        <div className="px-4 pb-4 pt-3 md:px-5 md:pb-5 md:pt-4">
          <div className="grid grid-cols-2 grid-rows-2 gap-x-4 gap-y-3 md:gap-x-5 md:gap-y-3.5" dir="ltr">
            {/* يسار فوق — السعر */}
            <div className="col-start-1 row-start-1 min-w-0 text-left">
              <div className={labelCls}>{t.price}</div>
              <div className={valueCls}>
                <PriceWithRiyal price={product.price} riyalClassName="h-4 w-4 md:h-5 md:w-5" />
              </div>
            </div>

            {/* يمين فوق — الاسم */}
            <div className="col-start-2 row-start-1 min-w-0 text-right">
              <div className={labelCls}>{t.name}</div>
              <div className={valueCls} dir={lang === "ar" ? "rtl" : "ltr"}>
                {localized.name}
              </div>
            </div>

            {/* يسار تحت — الحساسية */}
            <div className="col-start-1 row-start-2 min-w-0 text-left">
              <div className={labelCls}>{t.allergens}</div>
              <div className="mt-1">
                <AllergenIcons
                  allergens={product.allergens}
                  allergensEn={product.allergensEn}
                  lang={lang}
                  size="md"
                  className="justify-start"
                  emptyPlaceholder={<span className="opacity-40">—</span>}
                />
              </div>
            </div>

            {/* يمين تحت — السعرات */}
            <div className="col-start-2 row-start-2 min-w-0 text-right">
              <div className={labelCls}>{t.calories}</div>
              <div className={valueCls}>{product.calories}</div>
            </div>
          </div>

          {localized.description?.trim() && (
            <div className="mt-3 border-t border-black/10 pt-3 md:mt-3.5 md:pt-3.5">
              <div className={cn(labelCls, isEn ? "text-left" : "text-right")}>{t.description}</div>
              <p
                dir={isEn ? "ltr" : "rtl"}
                className={cn(
                  "mt-1 text-sm font-semibold leading-relaxed text-[#1a1a1a]/85 md:text-base",
                  isEn ? "text-left" : "text-right",
                )}
              >
                {localized.description}
              </p>
            </div>
          )}

          {cropLine && (
            <div className="mt-3 border-t border-black/10 pt-3 text-right md:mt-3.5 md:pt-3.5">
              <div className={labelCls}>{t.crop}</div>
              <p
                dir="rtl"
                className="mt-1 text-sm font-semibold leading-relaxed opacity-85 md:text-base"
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

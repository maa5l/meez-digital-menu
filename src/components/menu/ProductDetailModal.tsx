import { useEffect } from "react";
import { X } from "lucide-react";
import ProductCornerBadge from "@/components/menu/ProductCornerBadge";
import { ProductModalDetails } from "@/components/menu/ProductCardParts";
import { hasProductBadge, productBadgeColor, productBadgeLabel } from "@/lib/product-badge";
import { PRODUCT_IMAGE_ASPECT } from "@/lib/product-card-spec";
import { localizeProduct, type MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/domain";

type Props = {
  product: Product;
  lang: MenuLang;
  onClose: () => void;
};

const CloseButton = ({
  onClose,
  isAr,
  className,
}: {
  onClose: () => void;
  isAr: boolean;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClose}
    aria-label={isAr ? "إغلاق" : "Close"}
    className={cn(
      "z-40 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-black/10 touch-manipulation",
      className,
    )}
  >
    <X className="h-4 w-4" />
  </button>
);

/** نافذة تفاصيل المنتج — مُحسَّنة للآيباد (أفقي: صورة + تفاصيل جنباً إلى جنب) */
const ProductDetailModal = ({ product, lang, onClose }: Props) => {
  const localized = localizeProduct(product, lang);
  const isAr = lang === "ar";

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/60 p-4 backdrop-blur-sm overscroll-none md:p-6"
      onClick={onClose}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div
        className={cn(
          "flex w-full max-w-[min(94vw,520px)] flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl",
          "md:max-h-[min(88dvh,640px)] md:max-w-[min(92vw,760px)] md:flex-row",
          "lg:max-w-[min(90vw,840px)]",
        )}
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {product.image ? (
          <div
            className={cn(
              "relative flex shrink-0 flex-col",
              "p-4 pb-0 md:w-[40%] md:min-h-0 md:justify-center md:p-5 md:pe-3",
            )}
          >
            <div
              className="relative mx-auto w-full max-w-[320px] overflow-hidden rounded-[1.35rem] border-2 border-black/[0.06] bg-neutral-50 md:max-w-none"
              style={{ aspectRatio: PRODUCT_IMAGE_ASPECT }}
            >
              {hasProductBadge(product, lang) && (
                <ProductCornerBadge
                  text={productBadgeLabel(product, lang)!}
                  color={productBadgeColor(product)!}
                  size="md"
                  placement="inset"
                  className={cn("start-auto", isAr ? "right-2.5" : "left-2.5")}
                />
              )}
              <img
                src={product.image}
                alt={localized.name}
                className="absolute inset-0 h-full w-full object-contain p-3"
              />
              <CloseButton
                onClose={onClose}
                isAr={isAr}
                className={cn("absolute top-2.5", isAr ? "left-2.5" : "right-2.5")}
              />
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "flex shrink-0 px-4 pt-4 md:w-[40%] md:items-start md:justify-end md:p-5",
              isAr ? "justify-start" : "justify-end",
            )}
          >
            <CloseButton onClose={onClose} isAr={isAr} />
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 md:px-5 md:py-5 lg:px-6">
            <ProductModalDetails product={product} lang={lang} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;

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

/** نافذة تفاصيل المنتج — بوكس صغير، صورة كاملة، بيانات كاملة تحتها */
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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/60 p-3 backdrop-blur-sm overscroll-none touch-none"
      onClick={onClose}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div
        className="flex w-[min(88vw,340px)] max-w-full flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl sm:w-[min(86vw,360px)]"
        style={{ maxHeight: "min(90dvh, 720px)" }}
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >        {product.image ? (
          <div className="relative mx-3 mt-3 shrink-0 sm:mx-3.5">
            <div
              className="relative overflow-hidden rounded-[1.25rem] border-2 border-black/[0.06] bg-neutral-50"
              style={{ aspectRatio: PRODUCT_IMAGE_ASPECT }}
            >
              {hasProductBadge(product, lang) && (
                <ProductCornerBadge
                  text={productBadgeLabel(product, lang)!}
                  color={productBadgeColor(product)!}
                  size="md"
                  placement="inset"
                  className={cn(
                    "start-auto",
                    isAr ? "right-2.5" : "left-2.5",
                  )}
                />
              )}
              <img
                src={product.image}
                alt={localized.name}
                className="absolute inset-0 h-full w-full object-contain p-2.5"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label={isAr ? "إغلاق" : "Close"}
                className={cn(
                  "absolute top-2.5 z-40 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-black/10",
                  isAr ? "left-2.5" : "right-2.5",
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className={cn("flex shrink-0 px-3 pt-3", isAr ? "justify-start" : "justify-end")}>
            <button
              type="button"
              onClick={onClose}
              aria-label={isAr ? "إغلاق" : "Close"}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary shadow-sm ring-1 ring-black/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="shrink-0 px-3.5 pb-4 pt-3 sm:px-4">
          <ProductModalDetails product={product} lang={lang} dense />
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;

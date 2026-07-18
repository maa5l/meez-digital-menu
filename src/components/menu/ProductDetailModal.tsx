import { useEffect } from "react";
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

/** نافذة تفاصيل المنتج — إغلاق بالضغط خارج النافذة فقط */
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
          "md:max-h-[min(88dvh,640px)] md:max-w-[min(92vw,720px)] md:flex-row",
          "lg:max-w-[min(90vw,780px)]",
        )}
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {product.image ? (
          <div
            className={cn(
              "relative flex shrink-0 flex-col",
              "p-4 pb-0 md:w-[34%] md:min-h-0 md:justify-center md:p-4 md:pe-3",
            )}
          >
            <div
              className="relative mx-auto w-full max-w-[220px] overflow-hidden rounded-[1.25rem] border-2 border-black/[0.06] bg-neutral-50 md:max-w-none"
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
            </div>
          </div>
        ) : null}

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

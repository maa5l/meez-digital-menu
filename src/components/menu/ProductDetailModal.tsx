import { X } from "lucide-react";
import ProductCornerBadge from "@/components/menu/ProductCornerBadge";
import { MenuModalPortal } from "@/components/menu/MenuModalPortal";
import { ProductModalDetails } from "@/components/menu/ProductCardParts";
import { hasProductBadge, productBadgeColor, productBadgeLabel } from "@/lib/product-badge";
import { getMenuUi } from "@/lib/menu-i18n";
import { PRODUCT_CARD } from "@/lib/product-card-spec";
import {
  getProductLandscapeImage,
  getProductPortraitImage,
  PRODUCT_HERO_ASPECT_PORTRAIT,
} from "@/lib/product-spec";
import { localizeProduct, type MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/domain";

type Props = {
  product: Product;
  lang: MenuLang;
  onClose: () => void;
};

/** نافذة تفاصيل المنتج — portal + blur + حركة سلسة */
const ProductDetailModal = ({ product, lang, onClose }: Props) => {
  const localized = localizeProduct(product, lang);
  const isAr = lang === "ar";
  const ui = getMenuUi(lang);
  const modalImage = getProductPortraitImage(product) || getProductLandscapeImage(product);
  const modalAspect = getProductPortraitImage(product)
    ? PRODUCT_HERO_ASPECT_PORTRAIT
    : `${PRODUCT_CARD.imageWidth}/${PRODUCT_CARD.imageHeight}`;

  return (
    <MenuModalPortal
      onClose={onClose}
      dir={isAr ? "rtl" : "ltr"}
      className="max-w-[min(94vw,520px)] md:max-w-[min(92vw,720px)] lg:max-w-[min(90vw,780px)]"
      labelledBy="product-modal-title"
    >
      <div className="flex flex-col gap-3">
        <div className={cn("flex shrink-0", isAr ? "justify-start" : "justify-end")}>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-sm font-bold text-[#1a1a1a] shadow-lg ring-1 ring-black/[0.08] touch-manipulation"
            aria-label={ui.close}
          >
            <X className="h-4 w-4" aria-hidden />
            {ui.close}
          </button>
        </div>

        <div
          className={cn(
            "flex w-full flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl",
            "md:max-h-[min(88dvh,640px)] md:flex-row",
          )}
        >
        {modalImage ? (
          <div
            className={cn(
              "relative flex shrink-0 flex-col items-center justify-center",
              "p-4 pb-0 md:w-[38%] md:min-h-0 md:p-5 md:pe-4",
            )}
          >
            <div
              className="relative mx-auto w-full max-w-[250px] overflow-hidden rounded-[1.25rem] border-2 border-black/[0.06] bg-neutral-50"
              style={{
                aspectRatio: modalAspect,
                maxHeight: getProductPortraitImage(product) ? 320 : PRODUCT_CARD.imageHeight,
              }}
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
                src={modalImage}
                alt={localized.name}
                className="block h-full w-full object-contain object-center"
                decoding="async"
              />
            </div>
          </div>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 md:px-5 md:py-5 lg:px-6">
            <h2 id="product-modal-title" className="sr-only">
              {localized.name}
            </h2>
            <ProductModalDetails product={product} lang={lang} />
          </div>
        </div>
      </div>
      </div>
    </MenuModalPortal>
  );
};

export default ProductDetailModal;

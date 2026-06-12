import { useEffect, useState } from "react";
import type { Category, Product, MenuSettings } from "@/types/domain";
import { X } from "lucide-react";
import CategoryTabs from "@/components/menu/CategoryTabs";
import { MenuProductSubheaderBar, MenuProductTopChrome } from "@/components/menu/MenuProductTopChrome";
import { ProductGridCard, ProductModalDetails } from "@/components/menu/ProductCardParts";
import ProductCornerBadge from "@/components/menu/ProductCornerBadge";
import { useMenuLang } from "@/context/MenuLangContext";
import { hasProductBadge, productBadgeColor, productBadgeLabel } from "@/lib/product-badge";
import { localizeProduct } from "@/lib/product-i18n";
import { useProductTemplateScroll } from "@/hooks/useProductTemplateScroll";
import { getProductsHeaderCustomization, isProductsLangToggleEnabled } from "@/lib/menu-header-settings";
import { getProductsPalette, palettePageStyle } from "@/lib/menu-palette";
import type { MenuLang } from "@/lib/product-i18n";

type Props = {
  settings: MenuSettings;
  categories: Category[];
  products: Product[];
};

const TemplateProductsFeatured = ({ settings, categories, products }: Props) => {
  const { lang, toggleLang } = useMenuLang();
  const [activeCat, setActiveCat] = useState(() => categories[0]?.id ?? "");
  const [modal, setModal] = useState<Product | null>(null);
  const productsHeader = getProductsHeaderCustomization(settings);
  const hideHeader = productsHeader.hideHeader === true;
  const showLang = isProductsLangToggleEnabled(settings);
  const autoHideHeader = !hideHeader && productsHeader.autoHideHeaderOnScroll !== false;
  const { scrollRef, headerVisible } = useProductTemplateScroll(autoHideHeader);
  const hasSubheader = categories.length > 0 || (!hideHeader && showLang);

  useEffect(() => {
    if (categories.length === 0) {
      setActiveCat("");
      return;
    }
    if (!categories.some((c) => c.id === activeCat)) {
      setActiveCat(categories[0].id);
    }
  }, [categories, activeCat]);

  const visible =
    categories.length === 0
      ? products
      : activeCat
        ? products.filter((p) => p.categoryId === activeCat)
        : products;

  const palette = getProductsPalette(settings);
  const bgStyle = palettePageStyle(palette);
  const cardBg = palette.cardColor || "#d4d4d4";

  return (
    <div className="relative h-full flex flex-col min-h-0" dir={lang === "ar" ? "rtl" : "ltr"} style={bgStyle}>
      <MenuProductTopChrome
        settings={settings}
        lang={lang}
        visible={headerVisible}
        hideHeader={hideHeader}
        showLangInCompactBar={hideHeader && showLang}
        onLangToggle={toggleLang}
        scrollRef={scrollRef}
        subheader={
          hasSubheader ? (
            <MenuProductSubheaderBar settings={settings}>
              <CategoryTabs
                categories={categories}
                activeId={activeCat}
                accentColor={palette.accentColor}
                textColor={palette.textColor}
                lang={lang}
                onSelect={setActiveCat}
                onLangToggle={toggleLang}
                showLang={!hideHeader && showLang}
              />
            </MenuProductSubheaderBar>
          ) : undefined
        }
      >
        <div className="px-5 pb-8 pt-8 md:px-10 md:pt-10">
          <div className="grid grid-cols-2 gap-3 pt-2 md:grid-cols-3 md:gap-4 md:pt-3 lg:grid-cols-4">
            {visible.map((p) => (
              <ProductGridCard
                key={p.id}
                product={p}
                lang={lang}
                cardBg={cardBg}
                onClick={() => setModal(p)}
              />
            ))}
          </div>
        </div>
      </MenuProductTopChrome>

      {modal && (
        <DetailModal product={modal} lang={lang} onClose={() => setModal(null)} />
      )}
    </div>
  );
};

const DetailModal = ({
  product,
  lang,
  onClose,
}: {
  product: Product;
  lang: MenuLang;
  onClose: () => void;
}) => {
  const localized = localizeProduct(product, lang);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div
        className="relative w-full max-w-xl overflow-visible rounded-[2rem] bg-white shadow-2xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {product.image && (
          <div className="relative mx-3 mt-4 overflow-visible md:mx-4">
            {hasProductBadge(product, lang) && (
              <ProductCornerBadge
                text={productBadgeLabel(product, lang)!}
                color={productBadgeColor(product)!}
                size="md"
                className="start-1 -top-2 md:start-2"
              />
            )}
            <div className="relative aspect-square overflow-hidden rounded-[1.25rem] bg-neutral-100">
              <img
                src={product.image}
                alt={localized.name}
                className="h-full w-full object-cover object-center"
              />
              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 start-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        <div className="overflow-y-auto p-6">
          <ProductModalDetails product={product} lang={lang} />
        </div>
      </div>
    </div>
  );
};

export default TemplateProductsFeatured;

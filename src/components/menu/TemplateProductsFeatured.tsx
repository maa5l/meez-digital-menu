import { useEffect, useState } from "react";
import type { Category, Product, MenuSettings } from "@/types/domain";
import CategoryTabs from "@/components/menu/CategoryTabs";
import { MenuProductSubheaderBar, MenuProductTopChrome } from "@/components/menu/MenuProductTopChrome";
import { ProductGridCard } from "@/components/menu/ProductCardParts";
import ProductDetailModal from "@/components/menu/ProductDetailModal";
import { useMenuLang } from "@/context/MenuLangContext";
import { useProductTemplateScroll } from "@/hooks/useProductTemplateScroll";
import { getProductsHeaderCustomization, isProductsLangToggleEnabled } from "@/lib/menu-header-settings";
import { getProductsPalette, palettePageStyle } from "@/lib/menu-palette";
import { menuContentEnter } from "@/lib/menu-header";
import { cn } from "@/lib/utils";

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
  const hasSubheader = categories.length > 0 || showLang;

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
    <div
      className={cn("relative flex h-full min-h-0 flex-col", menuContentEnter)}
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={bgStyle}
      key={lang}
    >
      <MenuProductTopChrome
        settings={settings}
        lang={lang}
        visible={headerVisible}
        hideHeader={hideHeader}
        showLangInCompactBar={hideHeader && showLang && categories.length === 0}
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
                showLang={showLang}
              />
            </MenuProductSubheaderBar>
          ) : undefined
        }
      >
        <div className="px-4 pb-6 pt-4 md:px-8 md:pb-6 md:pt-5">
          <div
            key={`${lang}-${activeCat}`}
            className={cn(
              "grid grid-cols-2 gap-2.5 pt-1 md:grid-cols-3 md:gap-3 md:pt-2 lg:grid-cols-4",
              menuContentEnter,
            )}
          >
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
        <ProductDetailModal product={modal} lang={lang} onClose={() => setModal(null)} />
      )}
    </div>
  );
};

export default TemplateProductsFeatured;

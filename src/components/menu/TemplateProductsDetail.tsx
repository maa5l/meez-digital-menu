import { useEffect, useMemo, useState } from "react";
import type { Category, Product, MenuSettings } from "@/types/domain";
import CategoryTabs from "@/components/menu/CategoryTabs";
import { MenuProductSubheaderBar, MenuProductTopChrome } from "@/components/menu/MenuProductTopChrome";
import { ProductDetailCard, ProductListCard } from "@/components/menu/ProductCardParts";
import { useMenuLang } from "@/context/MenuLangContext";
import { useProductTemplateScroll } from "@/hooks/useProductTemplateScroll";
import { getMenuUi } from "@/lib/menu-i18n";
import { getProductsHeaderCustomization, isProductsLangToggleEnabled } from "@/lib/menu-header-settings";
import { menuContentEnter } from "@/lib/menu-header";
import { getProductsPalette, palettePageStyle } from "@/lib/menu-palette";
import { emptyCategoryNotice } from "@/lib/user-facing-errors";
import { UserErrorPanel } from "@/components/UserErrorPanel";
import { cn } from "@/lib/utils";

type Props = {
  settings: MenuSettings;
  categories: Category[];
  products: Product[];
};

const TemplateProductsDetail = ({ settings, categories, products }: Props) => {
  const { lang, toggleLang } = useMenuLang();
  const [activeCat, setActiveCat] = useState(() => categories[0]?.id ?? "");
  const productsHeader = getProductsHeaderCustomization(settings);
  const hideHeader = productsHeader.hideHeader === true;
  const showLang = isProductsLangToggleEnabled(settings);
  const autoHideHeader = !hideHeader && productsHeader.autoHideHeaderOnScroll !== false;
  const { scrollRef, headerVisible } = useProductTemplateScroll(autoHideHeader);

  useEffect(() => {
    if (categories.length === 0) {
      setActiveCat("");
      return;
    }
    if (!categories.some((c) => c.id === activeCat)) {
      setActiveCat(categories[0].id);
    }
  }, [categories, activeCat]);

  const visibleProducts = useMemo(
    () =>
      categories.length === 0
        ? products
        : activeCat
          ? products.filter((p) => p.categoryId === activeCat)
          : products,
    [categories.length, activeCat, products],
  );

  const featured = settings.featuredProductId
    ? products.find((p) => p.id === settings.featuredProductId)
    : null;

  const defaultProduct = useMemo(() => {
    if (featured && visibleProducts.some((p) => p.id === featured.id)) return featured;
    return visibleProducts[0];
  }, [featured, visibleProducts]);

  const [selected, setSelected] = useState<Product | undefined>(defaultProduct);

  useEffect(() => {
    setSelected((prev) => {
      if (prev && visibleProducts.some((p) => p.id === prev.id)) return prev;
      return defaultProduct;
    });
  }, [visibleProducts, defaultProduct]);

  const palette = getProductsPalette(settings);
  const bgStyle = palettePageStyle(palette);
  const cardBg = palette.cardColor || "#d4d4d4";
  const showLangInCompactBar = hideHeader && showLang && categories.length === 0;
  const hasSubheader = categories.length > 0 || (showLang && !showLangInCompactBar);
  const ui = getMenuUi(lang);

  return (
    <div
      className={cn("relative flex h-full min-h-0 flex-col overflow-hidden", menuContentEnter)}
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={bgStyle}
      key={lang}
    >
      <MenuProductTopChrome
        settings={settings}
        lang={lang}
        visible={headerVisible}
        hideHeader={hideHeader}
        showLangInCompactBar={showLangInCompactBar}
        onLangToggle={toggleLang}
        scrollRef={scrollRef}
        layoutMode="panel"
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
        <div
          dir={lang === "ar" ? "rtl" : "ltr"}
          key={`${lang}-${activeCat}`}
          className={cn(
            "grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:grid-cols-[minmax(0,46%)_minmax(0,54%)] md:items-stretch md:gap-3 md:px-5 ipad-lg:grid-cols-[minmax(0,48%)_minmax(0,52%)] ipad-lg:px-6",
            hideHeader && !hasSubheader ? "pt-1 md:pt-2" : "pt-2 md:pt-3",
            menuContentEnter,
          )}
        >
          {categories.length > 0 && visibleProducts.length === 0 ? (
            <div className="col-span-full flex min-h-0 flex-1 items-center justify-center">
              <UserErrorPanel error={emptyCategoryNotice()} compact />
            </div>
          ) : (
          <>
          <aside className="order-2 flex min-h-0 min-w-0 flex-col gap-2.5 overflow-y-auto overscroll-y-contain md:order-1 md:py-1">
            {visibleProducts.map((p) => (
              <ProductListCard
                key={p.id}
                product={p}
                lang={lang}
                cardBg={cardBg}
                active={selected?.id === p.id}
                accentColor={palette.accentColor}
                onClick={() => setSelected(p)}
              />
            ))}
          </aside>

          <div className="order-1 min-h-0 min-w-0 overflow-hidden md:order-2">
            {selected ? (
              <ProductDetailCard
                product={selected}
                lang={lang}
                cardBg={cardBg}
                accentColor={palette.accentColor}
                variant="panel"
                className="h-full"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center rounded-2xl text-sm font-bold opacity-50"
                style={{ background: cardBg }}
              >
                {ui.selectProduct}
              </div>
            )}
          </div>
          </>
          )}
        </div>
      </MenuProductTopChrome>
    </div>
  );
};

export default TemplateProductsDetail;

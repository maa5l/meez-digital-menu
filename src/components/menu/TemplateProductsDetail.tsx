import { useEffect, useMemo, useState } from "react";
import type { Category, Product, MenuSettings } from "@/types/domain";
import CategoryTabs from "@/components/menu/CategoryTabs";
import { MenuProductSubheaderBar, MenuProductTopChrome } from "@/components/menu/MenuProductTopChrome";
import { ProductDetailCard, ProductListCard } from "@/components/menu/ProductCardParts";
import { useProductTemplateScroll } from "@/hooks/useProductTemplateScroll";
import { getMenuTopChromeHeight } from "@/lib/menu-header";
import { getProductsPalette, palettePageStyle } from "@/lib/menu-palette";

type Props = {
  settings: MenuSettings;
  categories: Category[];
  products: Product[];
};

const TemplateProductsDetail = ({ settings, categories, products }: Props) => {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [activeCat, setActiveCat] = useState(() => categories[0]?.id ?? "");
  const { scrollRef, headerVisible } = useProductTemplateScroll();

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
  const showLang = settings.showLanguageToggle !== false;
  const hasSubheader = categories.length > 0 || showLang;
  const chromeH = getMenuTopChromeHeight(hasSubheader);
  const panelGapTop = 36;
  const panelGapBottom = 24;
  const panelHeight = `calc(100dvh - ${chromeH + panelGapTop + panelGapBottom}px)`;

  return (
    <div className="relative flex h-full min-h-0 flex-col" dir={lang === "ar" ? "rtl" : "ltr"} style={bgStyle}>
      <MenuProductTopChrome
        settings={settings}
        lang={lang}
        visible={headerVisible}
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
                onLangToggle={() => setLang(lang === "ar" ? "en" : "ar")}
                showLang={showLang}
              />
            </MenuProductSubheaderBar>
          ) : undefined
        }
      >
        <div
          dir="ltr"
          className="grid min-h-0 grid-cols-1 gap-3 px-4 pb-6 pt-2 md:grid-cols-[minmax(240px,34%)_1fr] md:items-stretch md:gap-4 md:px-6 md:pb-6 md:pt-4"
        >
          <div
            className="order-2 flex flex-col gap-2.5 overflow-y-auto overscroll-y-contain md:order-1 md:pt-8"
            style={{ height: panelHeight, maxHeight: panelHeight }}
          >
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
          </div>

          <div
            className="order-1 flex w-full flex-col md:order-2 md:pt-8"
            style={{ height: panelHeight, maxHeight: panelHeight }}
          >
            {selected ? (
              <ProductDetailCard
                product={selected}
                lang={lang}
                cardBg={cardBg}
                accentColor={palette.accentColor}
                className="h-full min-h-0 w-full"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center rounded-2xl text-sm font-bold opacity-50"
                style={{ background: cardBg }}
              >
                {lang === "ar" ? "اختر منتجًا" : "Select a product"}
              </div>
            )}
          </div>
        </div>
      </MenuProductTopChrome>
    </div>
  );
};

export default TemplateProductsDetail;

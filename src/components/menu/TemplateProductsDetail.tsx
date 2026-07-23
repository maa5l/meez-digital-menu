import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, Product, MenuSettings } from "@/types/domain";
import CategoryTabs from "@/components/menu/CategoryTabs";
import { MenuProductSubheaderBar, MenuProductTopChrome } from "@/components/menu/MenuProductTopChrome";
import ProductCenteredCard from "@/components/menu/product/ProductCenteredCard";
import { ProductListItemLabel } from "@/components/menu/product/ProductListItemLabel";
import { useMenuLang } from "@/context/MenuLangContext";
import { useMenuKioskSync } from "@/hooks/useMenuKioskSync";
import { getMenuUi } from "@/lib/menu-i18n";
import { getProductsHeaderCustomization, isProductsLangToggleEnabled } from "@/lib/menu-header-settings";
import { menuContentEnter } from "@/lib/menu-header";
import { getProductsPalette, palettePageStyle } from "@/lib/menu-palette";
import { emptyCategoryNotice } from "@/lib/user-facing-errors";
import { UserErrorPanel } from "@/components/UserErrorPanel";
import { cn } from "@/lib/utils";

/** تمرير تلقائي بين المنتجات — لهذه الشاشة فقط */
const PRODUCT_AUTO_ADVANCE_MS = 10_000;

type Props = {
  settings: MenuSettings;
  categories: Category[];
  products: Product[];
};

/**
 * قالب المنتجات — قائمة جانبية + معاينة بصورة كاملة + تفاصيل تحت الصورة
 * (نفس تصميم محاصيل PureShelf مع قسم تفاصيل إضافي).
 */
const TemplateProductsDetail = ({ settings, categories, products }: Props) => {
  const { lang, toggleLang } = useMenuLang();
  const [activeCat, setActiveCat] = useState(() => categories[0]?.id ?? "");
  const productsHeader = getProductsHeaderCustomization(settings);
  const hideHeader = productsHeader.hideHeader === true;
  const showLang = isProductsLangToggleEnabled(settings);
  const listRef = useRef<HTMLDivElement>(null);

  useMenuKioskSync(true);

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

  // تمرير تلقائي كل 10 ثوانٍ داخل التصنيف الحالي
  useEffect(() => {
    if (visibleProducts.length < 2) return;

    const id = window.setInterval(() => {
      setSelected((prev) => {
        if (!prev) return visibleProducts[0];
        const idx = visibleProducts.findIndex((p) => p.id === prev.id);
        const next = visibleProducts[(idx + 1) % visibleProducts.length];
        return next ?? prev;
      });
    }, PRODUCT_AUTO_ADVANCE_MS);

    return () => window.clearInterval(id);
  }, [visibleProducts]);

  useEffect(() => {
    const root = listRef.current;
    if (!root || !selected) return;
    const el = root.querySelector<HTMLElement>(`[data-product-id="${selected.id}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected?.id]);

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
        visible
        hideHeader={hideHeader}
        showLangInCompactBar={showLangInCompactBar}
        onLangToggle={toggleLang}
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
            "grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden px-3 pb-3 pt-1 md:grid-cols-[minmax(200px,28%)_1fr] md:items-stretch md:gap-3 md:px-4 md:pb-4 md:pt-1.5 ipad-lg:grid-cols-[minmax(220px,26%)_1fr] ipad-lg:px-5",
            menuContentEnter,
          )}
        >
          {categories.length > 0 && visibleProducts.length === 0 ? (
            <div className="col-span-full flex min-h-0 flex-1 items-center justify-center">
              <UserErrorPanel error={emptyCategoryNotice()} compact />
            </div>
          ) : (
            <>
              <aside
                ref={listRef}
                className="order-2 flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-y-contain md:order-1"
              >
                {visibleProducts.map((p) => {
                  const isActive = p.id === selected?.id;
                  const isFeatured = p.id === settings.featuredProductId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      data-product-id={p.id}
                      onClick={() => setSelected(p)}
                      className={cn(
                        "w-full overflow-hidden rounded-2xl px-3.5 py-2.5 text-start transition-all touch-manipulation",
                        "ring-1 ring-black/[0.04]",
                        isActive ? "shadow-md" : "bg-white/60 hover:bg-white/90",
                      )}
                      style={{
                        background: isActive ? palette.accentColor : undefined,
                        color: isActive ? "#fff" : palette.textColor,
                        boxShadow: isActive ? `0 4px 20px ${palette.accentColor}35` : undefined,
                      }}
                    >
                      <ProductListItemLabel
                        product={p}
                        lang={lang}
                        accentColor={palette.accentColor}
                        active={isActive}
                        featured={isFeatured}
                      />
                    </button>
                  );
                })}
              </aside>

              <div className="order-1 min-h-0 overflow-hidden rounded-[1.75rem] md:order-2">
                {selected ? (
                  <ProductCenteredCard
                    key={selected.id}
                    product={selected}
                    lang={lang}
                    cardBg={cardBg}
                    className="h-full min-h-0 w-full"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center rounded-[1.75rem] text-sm font-bold opacity-50"
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

import { useEffect, useState } from "react";
import type { Category, Product, MenuSettings } from "@/types/domain";
import MenuLangToggle from "@/components/menu/MenuLangToggle";
import { MenuProductSubheaderBar, MenuProductTopChrome } from "@/components/menu/MenuProductTopChrome";
import { ProductDetailCard, ProductListCard } from "@/components/menu/ProductCardParts";
import { useProductTemplateScroll } from "@/hooks/useProductTemplateScroll";
import { getMenuTopChromeHeight } from "@/lib/menu-header";

type Props = {
  settings: MenuSettings;
  categories: Category[];
  products: Product[];
};

const TemplateProductsDetail = ({ settings, products }: Props) => {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const featured = settings.featuredProductId
    ? products.find((p) => p.id === settings.featuredProductId)
    : null;
  const initial = featured ?? products[0];
  const [selected, setSelected] = useState<Product | undefined>(initial);
  const { scrollRef, headerVisible } = useProductTemplateScroll();

  useEffect(() => {
    setSelected(featured ?? products[0]);
  }, [featured, products]);

  const bgStyle: React.CSSProperties = settings.bgImage
    ? {
        backgroundImage: `linear-gradient(${settings.bgColor}cc, ${settings.bgColor}ee), url(${settings.bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: settings.textColor,
      }
    : { background: settings.bgColor, color: settings.textColor };

  const cardBg = settings.cardColor || "#d4d4d4";
  const showLang = settings.showLanguageToggle !== false;
  const chromeH = getMenuTopChromeHeight(showLang);
  const panelGapTop = 24;
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
          showLang ? (
            <MenuProductSubheaderBar settings={settings}>
              <div className="flex justify-end">
                <MenuLangToggle
                  lang={lang}
                  onToggle={() => setLang(lang === "ar" ? "en" : "ar")}
                  textColor={settings.textColor}
                  accentColor={settings.accentColor}
                />
              </div>
            </MenuProductSubheaderBar>
          ) : undefined
        }
      >
        {/* قائمة ~⅓ يساراً | تفاصيل ~⅔ يميناً — مثل المرجع */}
        <div
          dir="ltr"
          className="grid min-h-0 grid-cols-1 gap-3 px-4 pb-6 md:grid-cols-[minmax(240px,34%)_1fr] md:items-stretch md:gap-4 md:px-6 md:pb-6"
        >
          <div
            className="order-2 flex flex-col gap-2.5 overflow-y-auto overscroll-y-contain md:order-1 md:pt-6"
            style={{ height: panelHeight, maxHeight: panelHeight }}
          >
            {products.map((p) => (
              <ProductListCard
                key={p.id}
                product={p}
                lang={lang}
                cardBg={cardBg}
                active={selected?.id === p.id}
                accentColor={settings.accentColor}
                onClick={() => setSelected(p)}
              />
            ))}
          </div>

          <div
            className="order-1 flex w-full flex-col md:order-2 md:pt-6"
            style={{ height: panelHeight, maxHeight: panelHeight }}
          >
            {selected ? (
              <ProductDetailCard
                product={selected}
                lang={lang}
                cardBg={cardBg}
                accentColor={settings.accentColor}
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

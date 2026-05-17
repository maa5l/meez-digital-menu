import { useEffect, useState } from "react";
import type { Category, Product, MenuSettings } from "@/types/domain";
import MenuProductHeader from "@/components/menu/MenuProductHeader";
import { ProductDetailCard, ProductListCard } from "@/components/menu/ProductCardParts";

/**
 * قالب «هيدر + بطاقة كبيرة + قائمة جانبية» — مطابق للـ wireframe الأول.
 */
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

  return (
    <div className="h-full flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"} style={bgStyle}>
      <MenuProductHeader
        settings={settings}
        lang={lang}
        onLangToggle={() => setLang(lang === "ar" ? "en" : "ar")}
      />

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[minmax(260px,340px)_1fr] gap-4 px-5 md:px-10 pb-8 overflow-hidden min-h-0">
        <div className="overflow-y-auto space-y-2.5 md:space-y-3 order-2 md:order-1 min-h-0">
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

        <div className="order-1 md:order-2 min-h-[320px] md:min-h-0">
          {selected ? (
            <ProductDetailCard
              product={selected}
              lang={lang}
              cardBg={cardBg}
            />
          ) : (
            <div
              className="h-full rounded-[2rem] flex items-center justify-center text-sm opacity-50 font-bold"
              style={{ background: cardBg }}
            >
              {lang === "ar" ? "اختر منتجًا" : "Select a product"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateProductsDetail;

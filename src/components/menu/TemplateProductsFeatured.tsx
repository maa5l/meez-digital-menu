import { useEffect, useState } from "react";
import type { Category, Product, MenuSettings } from "@/types/domain";
import { X } from "lucide-react";
import CategoryTabs from "@/components/menu/CategoryTabs";
import { MenuProductSubheaderBar, MenuProductTopChrome } from "@/components/menu/MenuProductTopChrome";
import { ProductGridCard, ProductModalDetails } from "@/components/menu/ProductCardParts";
import { localizeProduct } from "@/lib/product-i18n";
import { useProductTemplateScroll } from "@/hooks/useProductTemplateScroll";
import { getProductsPalette, palettePageStyle } from "@/lib/menu-palette";

type Props = {
  settings: MenuSettings;
  categories: Category[];
  products: Product[];
};

const TemplateProductsFeatured = ({ settings, categories, products }: Props) => {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [activeCat, setActiveCat] = useState(() => categories[0]?.id ?? "");
  const [modal, setModal] = useState<Product | null>(null);
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
        scrollRef={scrollRef}
        subheader={
          categories.length > 0 || settings.showLanguageToggle !== false ? (
            <MenuProductSubheaderBar settings={settings}>
              <CategoryTabs
                categories={categories}
                activeId={activeCat}
                accentColor={palette.accentColor}
                textColor={palette.textColor}
                lang={lang}
                onSelect={setActiveCat}
                onLangToggle={() => setLang(lang === "ar" ? "en" : "ar")}
                showLang={settings.showLanguageToggle !== false}
              />
            </MenuProductSubheaderBar>
          ) : undefined
        }
      >
        <div className="px-5 pb-8 pt-8 md:px-10 md:pt-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
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
  lang: "ar" | "en";
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
      className="bg-white w-full max-w-xl rounded-[2rem] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {product.image && (
        <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden bg-white">
          <img
            src={product.image}
            alt={localized.name}
            className="h-full w-full object-cover object-center"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 start-3 w-9 h-9 rounded-full bg-white/95 shadow-sm flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="p-6">
        <ProductModalDetails product={product} lang={lang} />
      </div>
    </div>
  </div>
  );
};

export default TemplateProductsFeatured;

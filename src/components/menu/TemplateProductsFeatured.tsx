import { useEffect, useState } from "react";
import type { Category, Product, MenuSettings } from "@/types/domain";
import { X, Flame, AlertCircle } from "lucide-react";
import { Riyal } from "@/components/Brand";
import CategoryTabs from "@/components/menu/CategoryTabs";
import { MenuProductSubheaderBar, MenuProductTopChrome } from "@/components/menu/MenuProductTopChrome";
import { ProductGridCard } from "@/components/menu/ProductCardParts";
import { useProductTemplateScroll } from "@/hooks/useProductTemplateScroll";

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
                accentColor={settings.accentColor}
                textColor={settings.textColor}
                lang={lang}
                onSelect={setActiveCat}
                onLangToggle={() => setLang(lang === "ar" ? "en" : "ar")}
                showLang={settings.showLanguageToggle !== false}
              />
            </MenuProductSubheaderBar>
          ) : undefined
        }
      >
        <div className="px-5 md:px-10 pb-8 pt-3">
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
        <DetailModal
          product={modal}
          lang={lang}
          accent={settings.accentColor}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

const DetailModal = ({
  product,
  lang,
  accent,
  onClose,
}: {
  product: Product;
  lang: "ar" | "en";
  accent: string;
  onClose: () => void;
}) => (
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
        <div className="relative bg-white flex items-center justify-center px-4 py-6 min-h-[200px] max-h-[min(52vh,440px)]">
          <img
            src={product.image}
            alt={product.name}
            className="max-w-full max-h-[min(48vh,400px)] w-auto h-auto object-contain"
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
      <div className="p-6 text-[#1a1a1a]">
        <h2 className="font-display font-black text-2xl mb-2">{product.name}</h2>
        <p className="text-sm opacity-70 mb-4">{product.description}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Pill icon={<Riyal className="w-3.5 h-3.5" />} label={`${product.price}`} color={accent} />
          <Pill icon={<Flame className="w-3.5 h-3.5" />} label={`${product.calories}`} color={accent} />
          {product.allergens && (
            <Pill icon={<AlertCircle className="w-3.5 h-3.5" />} label={product.allergens} color={accent} />
          )}
        </div>
        {product.cropInfo?.beanName?.trim() && (
          <div className="mt-4 pt-4 border-t border-black/10 text-sm">
            <div className="text-xs font-bold opacity-50 mb-1">
              {lang === "ar" ? "اسم المحصول" : "Crop name"}
            </div>
            <p className="font-bold">{product.cropInfo.beanName}</p>
            {(product.cropInfo.country || product.cropInfo.process) && (
              <p className="text-xs opacity-60 mt-1">
                {[product.cropInfo.country, product.cropInfo.process].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
);

const Pill = ({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) => (
  <span
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm"
    style={{ background: `${color}1A`, color }}
  >
    {icon} {label}
  </span>
);

export default TemplateProductsFeatured;

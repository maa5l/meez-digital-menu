import { useState } from "react";
import { categories, products, type Product, type MenuSettings } from "@/lib/mockData";
import { Sparkles, Languages, Flame, AlertCircle, X } from "lucide-react";
import { Logo, Riyal } from "@/components/Brand";

/**
 * Template "Featured Header + Products Grid" — مطابق للموكب المرفق.
 * هيدر علوي يعرض "منتج/مشروب الشهر" مع لوقو وزر اللغة، ثم تبويبات الأقسام،
 * ثم بطاقات منتجات بصور كبيرة وتفاصيل (سعر، سعرات، حساسية، وصف).
 */
const TemplateProductsFeatured = ({ settings }: { settings: MenuSettings }) => {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [activeCat, setActiveCat] = useState(categories[0].id);
  const [modal, setModal] = useState<Product | null>(null);
  const visible = products.filter((p) => p.categoryId === activeCat);
  const featured = settings.featuredProductId
    ? products.find((p) => p.id === settings.featuredProductId)
    : null;

  const bgStyle: React.CSSProperties = settings.bgImage
    ? {
        backgroundImage: `linear-gradient(${settings.bgColor}cc, ${settings.bgColor}ee), url(${settings.bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: settings.textColor,
      }
    : { background: settings.bgColor, color: settings.textColor };

  const cardBg = settings.cardColor || "#ffffff";
  const headerTitle =
    settings.featuredTitle || (lang === "ar" ? "منتج / مشروب الشهر" : "Product of the Month");
  const subTitle = settings.featuredSubtitle || (featured ? featured.name : "");

  return (
    <div className="h-full flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"} style={bgStyle}>
      {/* Header */}
      <header
        className="shrink-0 px-6 md:px-10 py-5 flex items-center justify-between gap-4"
        style={{ background: `${settings.textColor}10` }}
      >
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="flex items-center gap-1.5 text-sm font-bold opacity-80 hover:opacity-100"
        >
          <Languages className="w-4 h-4" /> {lang === "ar" ? "EN" : "AR"}
        </button>

        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-2 text-[11px] md:text-xs font-bold opacity-70" style={{ color: settings.accentColor }}>
            <Sparkles className="w-3.5 h-3.5" /> {headerTitle}
          </div>
          <h1 className="font-display font-black text-2xl md:text-4xl mt-1 leading-tight">
            {subTitle || (lang === "ar" ? "اختر المنتج المميز" : "Pick a featured product")}
          </h1>
        </div>

        <Logo className="h-9 md:h-11 w-auto aspect-[1031/736]" />
      </header>

      {/* Featured product banner */}
      {featured && (
        <button
          onClick={() => setModal(featured)}
          className="mx-6 md:mx-10 mt-4 rounded-[1.5rem] p-4 flex items-center gap-4 text-start transition hover:scale-[1.005]"
          style={{ background: `${settings.accentColor}1A`, border: `1px solid ${settings.accentColor}55`, color: settings.textColor }}
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white overflow-hidden shrink-0">
            {(settings.featuredImage || featured.image) && (
              <img src={settings.featuredImage || featured.image} alt={featured.name} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-black text-lg md:text-xl truncate">{featured.name}</div>
            <div className="text-xs md:text-sm opacity-70 line-clamp-1">{featured.description}</div>
          </div>
          <div className="hidden md:flex items-center gap-1 font-bold text-lg shrink-0">
            {featured.price} <Riyal className="w-4 h-4" />
          </div>
        </button>
      )}

      {/* Categories */}
      <div className="px-6 md:px-10 py-4 shrink-0">
        <div className="flex flex-wrap gap-2.5 justify-end">
          {categories.map((c) => {
            const active = activeCat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className="px-5 py-2 rounded-full font-bold text-sm transition-all"
                style={{
                  background: active ? settings.accentColor : `${settings.textColor}15`,
                  color: active ? "#fff" : settings.textColor,
                }}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products grid */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((p) => (
            <button
              key={p.id}
              onClick={() => setModal(p)}
              className="rounded-[1.75rem] p-3 text-start transition hover:shadow-lg group"
              style={{ background: cardBg, color: "#1a1a1a" }}
            >
              <div className="aspect-[4/5] bg-white rounded-[1.25rem] overflow-hidden mb-3">
                {p.image && <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
              </div>
              <div className="px-1 pb-1">
                <h3 className="font-display font-bold text-base mb-2 line-clamp-1">{p.name}</h3>
                <div className="flex items-center justify-between text-xs opacity-80">
                  <span className="font-bold">{lang === "ar" ? "السعر" : "Price"}</span>
                  <span className="font-bold flex items-center gap-1">{p.price} <Riyal className="w-3 h-3" /></span>
                </div>
                <div className="flex items-center justify-between text-xs opacity-80 mt-1">
                  <span className="font-bold">{lang === "ar" ? "السعرات" : "Calories"}</span>
                  <span className="font-bold flex items-center gap-1"><Flame className="w-3 h-3" /> {p.calories}</span>
                </div>
                {p.allergens && (
                  <div className="flex items-center justify-between text-[11px] opacity-70 mt-1">
                    <span className="font-bold">{lang === "ar" ? "الحساسية" : "Allergens"}</span>
                    <span className="font-bold truncate ms-1">{p.allergens}</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {modal && <DetailModal product={modal} lang={lang} accent={settings.accentColor} onClose={() => setModal(null)} />}
    </div>
  );
};

const DetailModal = ({ product, lang, accent, onClose }: { product: Product; lang: "ar" | "en"; accent: string; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} dir={lang === "ar" ? "rtl" : "ltr"}>
    <div className="bg-white w-full max-w-xl rounded-[2rem] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      {product.image && (
        <div className="aspect-[16/10] relative">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          <button onClick={onClose} className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/95 flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
      )}
      <div className="p-6 text-[#1a1a1a]">
        <h2 className="font-display font-black text-2xl mb-2">{product.name}</h2>
        <p className="text-sm opacity-70 mb-4">{product.description}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Pill icon={<Riyal className="w-3.5 h-3.5" />} label={`${product.price}`} color={accent} />
          <Pill icon={<Flame className="w-3.5 h-3.5" />} label={`${product.calories}`} color={accent} />
          {product.allergens && <Pill icon={<AlertCircle className="w-3.5 h-3.5" />} label={product.allergens} color={accent} />}
        </div>
      </div>
    </div>
  </div>
);

const Pill = ({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm" style={{ background: `${color}1A`, color }}>
    {icon} {label}
  </span>
);

export default TemplateProductsFeatured;
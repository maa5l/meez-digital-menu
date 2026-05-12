import { useState } from "react";
import { categories, products, type Product, type MenuSettings } from "@/lib/mockData";
import { Sparkles, Languages, Flame, AlertCircle } from "lucide-react";
import { Logo, Riyal } from "@/components/Brand";

/**
 * Template "Featured Detail + Side List" — مطابق للموكب الثاني.
 * هيدر علوي، صورة منتج كبيرة على اليمين، وقائمة بطاقات صغيرة على اليسار.
 */
const TemplateProductsDetail = ({ settings }: { settings: MenuSettings }) => {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [activeCat, setActiveCat] = useState(categories[0].id);
  const visible = products.filter((p) => p.categoryId === activeCat);
  const featured = settings.featuredProductId
    ? products.find((p) => p.id === settings.featuredProductId)
    : null;
  const initial = featured && featured.categoryId === activeCat ? featured : visible[0] || products[0];
  const [selected, setSelected] = useState<Product>(initial);

  const bgStyle: React.CSSProperties = settings.bgImage
    ? { backgroundImage: `linear-gradient(${settings.bgColor}cc, ${settings.bgColor}ee), url(${settings.bgImage})`, backgroundSize: "cover", backgroundPosition: "center", color: settings.textColor }
    : { background: settings.bgColor, color: settings.textColor };

  const cardBg = settings.cardColor || "#ffffff";
  const headerTitle = settings.featuredTitle || (lang === "ar" ? "منتج / مشروب الشهر" : "Product of the Month");
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
          <h1 className="font-display font-black text-2xl md:text-3xl mt-1 leading-tight">
            {subTitle || (lang === "ar" ? "اختر المنتج المميز" : "Pick a featured product")}
          </h1>
        </div>

        <Logo className="h-9 md:h-11 w-auto aspect-[1031/736]" />
      </header>

      {/* Categories */}
      <div className="px-6 md:px-10 py-3 shrink-0">
        <div className="flex flex-wrap gap-2.5 justify-end">
          {categories.map((c) => {
            const active = activeCat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCat(c.id);
                  const first = products.find((p) => p.categoryId === c.id);
                  if (first) setSelected(first);
                }}
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

      {/* Body grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_minmax(280px,360px)] gap-5 px-6 md:px-10 pb-8 overflow-hidden">
        {/* Big detail card */}
        <div className="rounded-[2rem] p-5 flex flex-col overflow-hidden" style={{ background: cardBg, color: "#1a1a1a" }}>
          <div className="flex-1 bg-white rounded-[1.25rem] overflow-hidden flex items-center justify-center mb-4 min-h-[180px]">
            {selected.image && <img src={selected.image} alt={selected.name} className="max-w-full max-h-full object-contain" />}
          </div>
          <div className="px-2">
            <h2 className="font-display font-black text-2xl md:text-3xl mb-2">{selected.name}</h2>
            <p className="text-sm opacity-70 mb-3">{selected.description}</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Stat label={lang === "ar" ? "السعر" : "Price"} value={<span className="inline-flex items-center gap-1">{selected.price} <Riyal className="w-3 h-3" /></span>} accent={settings.accentColor} />
              <Stat label={lang === "ar" ? "السعرات" : "Calories"} value={<span className="inline-flex items-center gap-1"><Flame className="w-3 h-3" /> {selected.calories}</span>} accent={settings.accentColor} />
              <Stat label={lang === "ar" ? "الحساسية" : "Allergens"} value={<span className="inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {selected.allergens || "—"}</span>} accent={settings.accentColor} />
            </div>
          </div>
        </div>

        {/* Side list */}
        <div className="overflow-y-auto space-y-3 pr-1">
          {visible.map((p) => {
            const active = selected.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="w-full rounded-[1.5rem] p-3 flex items-center gap-3 text-start transition-all"
                style={{
                  background: cardBg,
                  color: "#1a1a1a",
                  ...(active ? { boxShadow: `0 0 0 2px ${settings.accentColor}` } : {}),
                }}
              >
                <div className="w-16 h-16 bg-white rounded-xl overflow-hidden shrink-0">
                  {p.image && <img src={p.image} alt={p.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-sm truncate mb-1">{p.name}</h3>
                  <div className="flex items-center justify-between text-[11px] opacity-80">
                    <span className="font-bold flex items-center gap-1">{p.price} <Riyal className="w-2.5 h-2.5" /></span>
                    <span className="font-bold flex items-center gap-1"><Flame className="w-3 h-3" /> {p.calories}</span>
                  </div>
                  {p.allergens && (
                    <div className="text-[10px] opacity-60 truncate mt-0.5">{p.allergens}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: React.ReactNode; accent: string }) => (
  <div className="rounded-xl px-2.5 py-2" style={{ background: `${accent}12` }}>
    <div className="text-[10px] font-bold opacity-60">{label}</div>
    <div className="font-bold text-sm mt-0.5" style={{ color: accent }}>{value}</div>
  </div>
);

export default TemplateProductsDetail;
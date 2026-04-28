import { useState } from "react";
import { categories, products, type Product, type MenuSettings, defaultMenuSettings } from "@/lib/mockData";
import { Flame, Leaf, X } from "lucide-react";
import walkingBurn from "@/assets/walking-burn.png";

/**
 * Template 1 — "Qae'mah Grid"
 * Matches the first uploaded mockup: title at top, category pills on the right,
 * white rounded product cards with image, name, price (riyal), calories.
 */
const TemplateGrid = ({ settings = defaultMenuSettings }: { settings?: MenuSettings }) => {
  const [activeCat, setActiveCat] = useState(categories[0].id);
  const [modal, setModal] = useState<Product | null>(null);
  const visible = products.filter((p) => p.categoryId === activeCat);

  return (
    <div
      className="h-full flex flex-col"
      dir="rtl"
      style={{ background: settings.bgColor, color: settings.textColor }}
    >
      {settings.showBurnBar && <BurnInfoBar accent={settings.accentColor} textColor={settings.textColor} />}

      {/* Header: centered logo + categories on the right */}
      <div className="px-8 pt-6 pb-4 shrink-0">
        <h1 className="text-center font-display font-black text-4xl tracking-tight mb-6" style={{ color: settings.textColor }}>
          Qae&rsquo;mah
        </h1>

        <div className="flex flex-wrap gap-3 justify-end">
          {categories.map((c) => {
            const active = activeCat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className="px-7 py-2.5 rounded-full font-bold text-base transition-all"
                style={{
                  background: active ? "#1a1a1a" : `${settings.accentColor}66`,
                  color: active ? "#fff" : settings.textColor,
                }}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards grid */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {visible.map((p) => (
            <button
              key={p.id}
              onClick={() => setModal(p)}
              className="group bg-[#ededed] rounded-[2rem] p-3 text-right hover:shadow-lg transition-all duration-300"
            >
              {/* Image area */}
              <div className="aspect-square bg-white rounded-[1.5rem] overflow-hidden mb-3 flex items-center justify-center">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-1/2 h-1/2 rounded-full bg-[#d9d9d9]" />
                )}
              </div>

              {/* Name */}
              <div className="px-2">
                <h3 className="font-display font-bold text-lg text-[#1a1a1a] mb-2 line-clamp-1">
                  {p.name}
                </h3>

                {/* Footer: price (right) and calories (left) */}
                <div className="flex items-center justify-between text-[#3a3a3a]">
                  <div className="flex items-center gap-1.5">
                    <RiyalIcon className="w-4 h-4" />
                    <span className="font-bold text-base">
                      {toArabicNum(p.price)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4" />
                    <span className="font-bold text-base">
                      {toArabicNum(p.calories)}
                    </span>
                  </div>
                </div>

                {/* Vegan-like icon, top-left of footer area */}
                <div className="mt-1 text-[#3a3a3a]">
                  <Leaf className="w-3.5 h-3.5 opacity-50" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {modal && <DetailModal product={modal} onClose={() => setModal(null)} />}
    </div>
  );
};

/* ---------- Burn-info bar ---------- */
const BurnInfoBar = ({ accent, textColor }: { accent: string; textColor: string }) => (
  <div
    className="px-6 py-1.5 flex items-center justify-center gap-2 text-[11px] md:text-xs border-b"
    style={{ background: `${accent}40`, borderColor: `${accent}80`, color: textColor }}
  >
    <img src={walkingBurn} alt="" className="w-4 h-4 object-contain" />
    <span className="font-bold">
      تفاصيل حرق السعرات: المشي ٣٠ دقيقة يحرق ~١٥٠ سعرة • الجري ١٠ دقائق يحرق ~١٠٠ سعرة
    </span>
  </div>
);

/* ---------- helpers ---------- */
const toArabicNum = (n: number) =>
  n.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);

const RiyalIcon = ({ className }: { className?: string }) => (
  // Saudi riyal symbol (Unicode ﷼)
  <span className={`inline-flex items-center justify-center font-bold ${className}`}>
    ﷼
  </span>
);

const DetailModal = ({ product, onClose }: { product: Product; onClose: () => void }) => (
  <div
    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={onClose}
    dir="rtl"
  >
    <div
      className="bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {product.image && (
        <div className="aspect-[16/10] overflow-hidden relative bg-[#ededed]">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/95 flex items-center justify-center text-[#1a1a1a] hover:scale-110 transition-transform"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="p-8">
        <h2 className="font-display font-black text-3xl text-[#1a1a1a] mb-3">{product.name}</h2>
        <p className="text-[#5a5a5a] leading-relaxed mb-6">{product.description}</p>
        <div className="flex items-center gap-6 text-[#1a1a1a]">
          <div className="flex items-center gap-2 font-bold text-xl">
            <RiyalIcon className="w-5 h-5" />
            {toArabicNum(product.price)}
          </div>
          <div className="flex items-center gap-2 font-bold text-xl">
            <Flame className="w-5 h-5" />
            {toArabicNum(product.calories)}
          </div>
        </div>

        {product.cropInfo && <CropInfoBlock info={product.cropInfo} />}
      </div>
    </div>
  </div>
);

const CropInfoBlock = ({ info }: { info: NonNullable<Product["cropInfo"]> }) => {
  const rows: [string, string][] = [
    ["اسم البن", info.beanName],
    ["البلد", info.country],
    ["نوع المعالجة", info.process],
    ["السلالة", info.variety],
    ["الارتفاع", info.altitude],
    ["الإيحاءات", info.notes],
  ];
  return (
    <div className="mt-6 bg-[#F7F8F0] border border-[#9CD5FF]/50 rounded-2xl p-5">
      <h4 className="font-display font-black text-lg text-[#1a3a55] mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#9CD5FF]" />
        معلومات المحاصيل
      </h4>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-dashed border-[#9CD5FF]/40 py-1.5">
            <span className="text-[#5a5a5a]">{k}</span>
            <span className="font-bold text-[#1a1a1a]">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateGrid;
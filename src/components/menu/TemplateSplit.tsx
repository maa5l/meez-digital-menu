import { useState } from "react";
import { categories, products, type Product, type MenuSettings, defaultMenuSettings } from "@/lib/mockData";
import { Flame, Leaf } from "lucide-react";
import walkingBurn from "@/assets/walking-burn.png";
import menuHeroCoffee from "@/assets/menu-hero-coffee.png";

/**
 * Template 2 — "Qae'mah Hero + Split"
 * Matches the second uploaded mockup: black hero banner with "مشروب الموسم"
 * + product image, category pills, list of products (left) and big detail
 * panel (right).
 */
const TemplateSplit = ({ settings = defaultMenuSettings }: { settings?: MenuSettings }) => {
  const [activeCat, setActiveCat] = useState(categories[0].id);
  const visible = products.filter((p) => p.categoryId === activeCat);
  const [selected, setSelected] = useState<Product>(visible[0] || products[0]);

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      dir="rtl"
      style={{ background: settings.bgColor, color: settings.textColor }}
    >
      {settings.showBurnBar && (
        <div
          className="px-6 py-1.5 flex items-center justify-center gap-2 text-[11px] md:text-xs shrink-0 border-b"
          style={{ background: `${settings.accentColor}40`, borderColor: `${settings.accentColor}80`, color: settings.textColor }}
        >
          <img src={walkingBurn} alt="" className="w-4 h-4 object-contain" />
          <span className="font-bold">
            تفاصيل حرق السعرات: المشي ٣٠ دقيقة يحرق ~١٥٠ سعرة • الجري ١٠ دقائق يحرق ~١٠٠ سعرة
          </span>
        </div>
      )}

      {/* Hero banner */}
      <div className="relative bg-[#0a0a0a] px-8 py-4 shrink-0">
        <h1 className="text-center font-display font-black text-3xl text-white tracking-tight">
          Qae&rsquo;mah
        </h1>

        <div className="grid grid-cols-2 items-center mt-2">
          {/* Featured product image — coffee bag */}
          <div className="flex justify-center">
            <img
              src={menuHeroCoffee}
              alt="بن مختص"
              className="h-32 md:h-44 object-contain drop-shadow-2xl"
            />
          </div>

          {/* Title (right in RTL) */}
          <div className="text-right">
            <h2 className="font-display font-black text-3xl md:text-5xl leading-tight" style={{ color: settings.accentColor }}>
              بن الموسم
            </h2>
            <p className="text-white/70 text-sm md:text-base mt-2">
              مختارات حصرية من أجود المحاصيل
            </p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-8 py-4 shrink-0" style={{ background: settings.bgColor }}>
        <div className="flex flex-wrap gap-3 justify-end">
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
                className="px-7 py-2 rounded-full font-bold text-base transition-all"
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

      {/* Body: list (right column, narrow) + detail (left column, wide) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[minmax(280px,360px)_1fr] gap-5 px-8 pb-8 overflow-hidden">
        {/* List */}
        <div className="overflow-y-auto space-y-3 pr-1">
          {visible.map((p) => {
            const active = selected.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`w-full bg-[#ededed] rounded-[1.75rem] p-3 flex items-center gap-4 text-right transition-all ${
                  active ? "ring-2 ring-[#9CD5FF] shadow-md" : "hover:shadow-sm"
                }`}
              >
                <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden shrink-0 flex items-center justify-center">
                  {p.image && <img src={p.image} alt={p.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-base text-[#1a1a1a] mb-2 truncate">
                    {p.name}
                  </h3>
                  <div className="flex items-center justify-between text-[#3a3a3a] text-sm">
                    <div className="flex items-center gap-1.5">
                      <RiyalIcon className="w-3.5 h-3.5" />
                      <span className="font-bold">{toArabicNum(p.price)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" />
                      <span className="font-bold">{toArabicNum(p.calories)}</span>
                    </div>
                    <Leaf className="w-3.5 h-3.5 opacity-50" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail */}
        <div className="bg-[#ededed] rounded-[2rem] p-5 flex flex-col overflow-hidden">
          {/* Big image area */}
          <div className="flex-[1.2] bg-white rounded-[1.5rem] flex items-center justify-center overflow-hidden mb-4 min-h-[150px]">
            {selected.image && (
              <img
                src={selected.image}
                alt={selected.name}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>

          {/* Footer info */}
          <div className="px-2 overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-2">
              <Leaf className="w-5 h-5 text-[#3a3a3a] opacity-60 mt-2 shrink-0" />
              <h2 className="font-display font-black text-2xl md:text-3xl text-[#1a1a1a]">
                {selected.name}
              </h2>
            </div>
            <p className="text-[#5a5a5a] text-sm leading-relaxed text-right mb-3">
              {selected.description}
            </p>
            <div className="flex items-center justify-between text-[#1a1a1a]">
              <div className="flex items-center gap-2 font-bold text-lg">
                <RiyalIcon className="w-5 h-5" />
                {toArabicNum(selected.price)}
              </div>
              <div className="flex items-center gap-2 font-bold text-lg">
                <Flame className="w-5 h-5" />
                {toArabicNum(selected.calories)}
              </div>
            </div>

            {selected.cropInfo && (
              <div className="mt-4 bg-[#F7F8F0] border border-[#9CD5FF]/60 rounded-2xl p-4">
                <h4 className="font-display font-black text-base text-[#1a3a55] mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#9CD5FF]" />
                  معلومات المحاصيل
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {([
                    ["اسم البن", selected.cropInfo.beanName],
                    ["البلد", selected.cropInfo.country],
                    ["المعالجة", selected.cropInfo.process],
                    ["السلالة", selected.cropInfo.variety],
                    ["الارتفاع", selected.cropInfo.altitude],
                    ["الإيحاءات", selected.cropInfo.notes],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-dashed border-[#9CD5FF]/40 py-1">
                      <span className="text-[#5a5a5a]">{k}</span>
                      <span className="font-bold text-[#1a1a1a]">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const toArabicNum = (n: number) =>
  n.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);

const RiyalIcon = ({ className }: { className?: string }) => (
  <span className={`inline-flex items-center justify-center font-bold ${className}`}>﷼</span>
);

export default TemplateSplit;
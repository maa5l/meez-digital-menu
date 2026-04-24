import { useState } from "react";
import { categories, products, type Product } from "@/lib/mockData";
import { Flame, Leaf } from "lucide-react";

/**
 * Template 2 — "Qae'mah Hero + Split"
 * Matches the second uploaded mockup: black hero banner with "مشروب الموسم"
 * + product image, category pills, list of products (left) and big detail
 * panel (right).
 */
const TemplateSplit = () => {
  const [activeCat, setActiveCat] = useState(categories[0].id);
  const visible = products.filter((p) => p.categoryId === activeCat);
  const [selected, setSelected] = useState<Product>(visible[0] || products[0]);

  const featured = products[0]; // Seasonal pick

  return (
    <div className="h-full bg-[#fafafa] flex flex-col overflow-hidden" dir="rtl">
      {/* Hero banner */}
      <div className="relative bg-[#0a0a0a] px-8 py-4 shrink-0">
        <h1 className="text-center font-display font-black text-3xl text-white tracking-tight">
          Qae&rsquo;mah
        </h1>

        <div className="grid grid-cols-2 items-center mt-2">
          {/* Featured image (left in RTL = visually left) */}
          <div className="flex justify-center">
            {featured.image && (
              <img
                src={featured.image}
                alt={featured.name}
                className="h-32 md:h-40 object-contain drop-shadow-2xl"
              />
            )}
          </div>

          {/* Title (right in RTL) */}
          <div className="text-right">
            <h2 className="font-display font-black text-3xl md:text-5xl text-[#c9a878] leading-tight">
              مشروب الموسم
            </h2>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-8 py-4 shrink-0 bg-[#fafafa]">
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
                className={`px-7 py-2 rounded-full font-bold text-base transition-all ${
                  active
                    ? "bg-[#1a1a1a] text-white shadow-md"
                    : "bg-[#d9d9d9] text-[#4a4a4a] hover:bg-[#c9c9c9]"
                }`}
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
                  active ? "ring-2 ring-[#c9a878] shadow-md" : "hover:shadow-sm"
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
          <div className="flex-1 bg-white rounded-[1.5rem] flex items-center justify-center overflow-hidden mb-4">
            {selected.image && (
              <img
                src={selected.image}
                alt={selected.name}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>

          {/* Footer info */}
          <div className="px-2">
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
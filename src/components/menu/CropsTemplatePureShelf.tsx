import { useState } from "react";
import { crops, type Crop, type MenuSettings } from "@/lib/mockData";

/**
 * Crops Template — Minimal.
 * قائمة جانبية + عرض نصّي مينمال للمحصول النشط، بدون رسومات.
 */
const CropsTemplatePureShelf = ({ settings }: { settings: MenuSettings }) => {
  const [active, setActive] = useState<Crop>(crops[0]);
  const fg = active.textColor || settings.textColor;
  let bg: string = active.cardColor || settings.bgColor;
  const showImage = active.bgType === "image" && active.image;
  if (active.bgType === "gradient" && active.gradientColors?.length) {
    bg = `linear-gradient(135deg, ${active.gradientColors.join(", ")})`;
  } else if (active.bgType === "color" && active.cardColor) {
    bg = active.cardColor;
  }

  return (
    <div
      className="h-full grid grid-cols-1 md:grid-cols-[280px_1fr]"
      dir="rtl"
      style={{ background: settings.bgColor, color: settings.textColor }}
    >
      {/* Sidebar list */}
      <aside className="border-l p-6 overflow-y-auto" style={{ borderColor: `${settings.textColor}15` }}>
        <h3 className="font-display font-black text-sm opacity-60 mb-4">محاصيل البن</h3>
        <div className="space-y-1">
          {crops.map((c) => {
            const isActive = c.id === active.id;
            return (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className="w-full text-right px-4 py-3 rounded-xl font-bold transition-all text-sm"
                style={{
                  background: isActive ? settings.accentColor : "transparent",
                  color: isActive ? "#fff" : settings.textColor,
                }}
              >
                {c.beanName}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Detail */}
      <main className="relative flex flex-col justify-center p-10 md:p-16 overflow-hidden" style={{ background: bg, color: fg }}>
        {showImage && (
          <>
            <img src={active.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
          </>
        )}
        <div className="max-w-2xl relative">
          <p className="text-sm uppercase tracking-[0.3em] opacity-60 mb-4">Specialty Coffee</p>
          <h1 className="font-display font-black leading-none mb-2"
              style={{ fontSize: "clamp(3rem, 7vw, 6rem)" }}>
            {active.beanName}
          </h1>
          <p className="text-xl md:text-2xl opacity-70 mb-10">{active.beanNameEn}</p>

          <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-base md:text-lg mb-10">
            <Row k="البلد · Country" v={`${active.country} • ${active.countryEn}`} />
            <Row k="المعالجة · Process" v={`${active.process} • ${active.processEn}`} />
            <Row k="السلالة · Variety" v={active.variety} />
            <Row k="الارتفاع · Altitude" v={active.altitude} />
          </div>

          <div className="border-t pt-6" style={{ borderColor: `${fg}30` }}>
            <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Tasting Notes</div>
            <div className="font-bold text-xl md:text-2xl">{active.notes}</div>
            <div className="text-base md:text-lg opacity-70 mt-1">{active.notesEn}</div>
          </div>
        </div>
      </main>
    </div>
  );
};

const Row = ({ k, v }: { k: string; v: string }) => (
  <div>
    <div className="text-xs uppercase tracking-wider opacity-60 mb-1">{k}</div>
    <div className="font-bold">{v}</div>
  </div>
);

export default CropsTemplatePureShelf;
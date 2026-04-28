import { useState } from "react";
import { crops, type Crop, type MenuSettings } from "@/lib/mockData";
import menuHeroCoffee from "@/assets/menu-hero-coffee.png";

/**
 * Crops Template 2 — "Pure Shelf" style.
 * خلفية مرحة بألوان العلامة، صورة كيس البن على اليسار،
 * اسم البن الكبير على اليمين + بلد المنشأ والمعالجة + الإيحاءات.
 */
const CropsTemplatePureShelf = ({ settings }: { settings: MenuSettings }) => {
  const [active, setActive] = useState<Crop>(crops[0]);

  return (
    <div
      className="h-full flex flex-col"
      dir="rtl"
      style={{ background: settings.bgColor, color: settings.textColor }}
    >
      {/* Selector pills */}
      <div className="px-6 pt-6 pb-3 shrink-0">
        <div className="flex flex-wrap gap-2 justify-end">
          {crops.map((c) => {
            const isActive = c.id === active.id;
            return (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className="px-5 py-2 rounded-full text-sm font-bold transition-all"
                style={{
                  background: isActive ? "#1a1a1a" : `${settings.accentColor}50`,
                  color: isActive ? "#fff" : settings.textColor,
                }}
              >
                {c.beanName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main illustrated card */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div
          className="h-full rounded-[2.5rem] relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${settings.accentColor} 0%, ${settings.accentColor}cc 60%, #fde68a 100%)`,
          }}
        >
          {/* Decorative star bursts */}
          <Decor accent="#fde68a" />
          <Decor accent="#fb923c" className="bottom-12 right-16 rotate-45" />
          <Decor accent="#f87171" className="top-20 right-1/3" />

          <div className="relative h-full grid grid-cols-2 items-center px-8 md:px-16">
            {/* Bag image (left) */}
            <div className="flex justify-center">
              <img
                src={menuHeroCoffee}
                alt={active.beanName}
                className="h-64 md:h-96 object-contain drop-shadow-2xl"
              />
            </div>

            {/* Text (right) */}
            <div className="text-right space-y-6">
              <h1
                className="font-display font-black leading-none"
                style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", color: "#1a3a55" }}
              >
                {active.beanName}
              </h1>

              <div className="grid grid-cols-2 gap-x-6 gap-y-1 max-w-md mr-auto">
                <div>
                  <div className="font-bold text-lg" style={{ color: "#1a1a1a" }}>{active.countryEn}</div>
                  <div className="text-xs opacity-70" style={{ color: "#1a1a1a" }}>{active.processEn}</div>
                </div>
                <div>
                  <div className="font-bold text-lg" style={{ color: "#1a1a1a" }}>{active.country}</div>
                  <div className="text-xs opacity-70" style={{ color: "#1a1a1a" }}>{active.process}</div>
                </div>
              </div>

              <div className="border-t pt-4 max-w-md mr-auto" style={{ borderColor: "#1a1a1a40" }}>
                <p className="font-bold text-base md:text-lg" style={{ color: "#1a1a1a" }}>
                  {active.notes}
                </p>
                <p className="text-sm md:text-base opacity-80 mt-1" style={{ color: "#1a1a1a" }}>
                  {active.notesEn}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Decor = ({ accent, className = "" }: { accent: string; className?: string }) => (
  <svg
    className={`absolute w-16 h-16 opacity-70 ${className || "top-10 left-12"}`}
    viewBox="0 0 100 100"
    fill="none"
    stroke={accent}
    strokeWidth="6"
    strokeLinejoin="round"
  >
    <path d="M50 5 L60 40 L95 50 L60 60 L50 95 L40 60 L5 50 L40 40 Z" />
  </svg>
);

export default CropsTemplatePureShelf;
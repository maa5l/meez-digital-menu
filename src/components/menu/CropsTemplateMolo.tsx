import { useState } from "react";
import { crops, type Crop, type MenuSettings } from "@/lib/mockData";
import { Bike } from "lucide-react";

/**
 * Crops Template 1 — "Molo" style.
 * كرت بخلفية لون موحّد هادئة، أيقونة دراجة فوق، عمودان (إنجليزي/عربي)
 * يفصل بينهما خط رأسي، والإيحاءات بالأسفل بسطر مزدوج.
 */
const CropsTemplateMolo = ({ settings }: { settings: MenuSettings }) => {
  const [active, setActive] = useState<Crop>(crops[0]);

  return (
    <div
      className="h-full flex flex-col"
      dir="rtl"
      style={{ background: settings.bgColor, color: settings.textColor }}
    >
      {/* Sidebar selector + main card */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 p-6 overflow-hidden">
        {/* List of crops */}
        <div className="overflow-y-auto space-y-2 pr-1">
          <h3 className="font-display font-black text-sm opacity-60 mb-3 px-2">
            محاصيل البن
          </h3>
          {crops.map((c) => {
            const isActive = c.id === active.id;
            return (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className="w-full text-right px-4 py-3 rounded-2xl font-bold transition-all"
                style={{
                  background: isActive ? settings.accentColor : "transparent",
                  color: isActive ? "#1a1a1a" : settings.textColor,
                  border: isActive ? "none" : `1px solid ${settings.textColor}20`,
                }}
              >
                {c.beanName}
              </button>
            );
          })}
        </div>

        {/* Big card */}
        <div
          className="rounded-[2.5rem] flex flex-col items-center justify-center p-10 md:p-16"
          style={{ background: `${settings.accentColor}40` }}
        >
          {/* Bike icon */}
          <Bike
            className="w-20 h-20 md:w-28 md:h-28 mb-10"
            strokeWidth={1.4}
            style={{ color: settings.textColor }}
          />

          {/* Two columns split by vertical line */}
          <div
            className="grid grid-cols-2 gap-12 w-full max-w-2xl"
            style={{ color: settings.textColor }}
          >
            {/* English (left in RTL grid = appears left visually due to dir) */}
            <div className="text-left space-y-2 pl-6 border-l" style={{ borderColor: `${settings.textColor}40` }}>
              <p className="font-bold text-base md:text-lg">{active.beanNameEn}</p>
              <p className="text-sm md:text-base">{active.variety}</p>
              <p className="text-sm md:text-base">{active.processEn}</p>
              <p className="text-sm md:text-base">{active.altitude.replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)])}</p>
            </div>

            {/* Arabic */}
            <div className="text-right space-y-2 pr-6">
              <p className="font-bold text-base md:text-lg">{active.beanName}</p>
              <p className="text-sm md:text-base">{active.variety}</p>
              <p className="text-sm md:text-base">{active.process}</p>
              <p className="text-sm md:text-base">{active.altitude}</p>
            </div>
          </div>

          {/* Notes */}
          <div
            className="mt-12 text-center space-y-1.5 max-w-2xl"
            style={{ color: settings.textColor }}
          >
            <p className="font-bold text-sm md:text-base">{active.notes}</p>
            <p className="text-sm md:text-base opacity-80">{active.notesEn}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CropsTemplateMolo;
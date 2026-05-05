import { crops, type MenuSettings } from "@/lib/mockData";
import { Bike } from "lucide-react";

/**
 * Crops Template — "Cards Carousel".
 * بطاقات أفقية تتحرك بالعرض، كل بطاقة تظهر معلومات محصول كامل.
 * تستخدم لون البطاقة وصورتها ولون خطها لو تم تعريفها من الإعدادات.
 */
const CropsTemplateMolo = ({ settings }: { settings: MenuSettings }) => {
  return (
    <div
      className="h-full flex flex-col"
      dir="rtl"
      style={{ background: settings.bgColor, color: settings.textColor }}
    >
      <div className="px-8 pt-8 pb-4 shrink-0">
        <h1 className="font-display font-black text-3xl md:text-4xl">محاصيل البن</h1>
        <p className="text-sm opacity-70 mt-1">Coffee Crops</p>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-8">
        <div className="flex gap-6 h-full snap-x snap-mandatory">
          {crops.map((c) => {
            const fg = c.textColor || settings.textColor;
            let bg: string = c.cardColor || `${settings.accentColor}25`;
            const showImage = c.bgType === "image" && c.image;
            if (c.bgType === "gradient" && c.gradientColors?.length) {
              bg = `linear-gradient(135deg, ${c.gradientColors.join(", ")})`;
            } else if (c.bgType === "color" && c.cardColor) {
              bg = c.cardColor;
            }
            return (
              <article
                key={c.id}
                className="snap-center shrink-0 w-[78vw] md:w-[520px] h-full rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between relative overflow-hidden"
                style={{ background: bg, color: fg }}
              >
                {showImage && (
                  <img
                    src={c.image}
                    alt={c.beanName}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                {showImage && <div className="absolute inset-0 bg-black/30" />}
                <div className="relative">
                  <Bike className="w-14 h-14 mb-6" strokeWidth={1.5} />
                  <h2 className="font-display font-black text-3xl md:text-4xl leading-tight">
                    {c.beanName}
                  </h2>
                  <p className="text-base md:text-lg opacity-80 mt-1">{c.beanNameEn}</p>
                </div>

                <div className="relative grid grid-cols-2 gap-x-6 gap-y-3 mt-8 text-sm md:text-base">
                  <Cell label="البلد" value={c.country} />
                  <Cell label="Country" value={c.countryEn} />
                  <Cell label="المعالجة" value={c.process} />
                  <Cell label="Process" value={c.processEn} />
                  <Cell label="السلالة" value={c.variety} />
                  <Cell label="الارتفاع" value={c.altitude} />
                </div>

                <div className="relative border-t pt-4 mt-6" style={{ borderColor: `${fg}30` }}>
                  <div className="font-bold text-base md:text-lg">{c.notes}</div>
                  <div className="text-sm opacity-70">{c.notesEn}</div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Cell = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-xs opacity-60">{label}</div>
    <div className="font-bold">{value}</div>
  </div>
);

export default CropsTemplateMolo;
import { useState } from "react";
import { UtensilsCrossed, Sprout } from "lucide-react";
import type { MenuSettings } from "@/types/domain";
import MenuCalorieDisclaimer from "@/components/menu/MenuCalorieDisclaimer";

type Props = {
  settings: MenuSettings;
  type: "products" | "crops";
};

const MenuEmptyState = ({ settings, type }: Props) => {
  const [lang] = useState<"ar" | "en">("ar");
  const isCrops = type === "crops";
  return (
    <div
      className="flex-1 flex flex-col min-h-0"
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={{ color: settings.textColor }}
    >
      <header className="shrink-0 border-b border-black/5" style={{ color: settings.textColor }}>
        <MenuCalorieDisclaimer lang={lang} textColor={settings.textColor} />
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: `${settings.accentColor}22` }}
      >
        {isCrops ? (
          <Sprout className="w-10 h-10" style={{ color: settings.accentColor }} />
        ) : (
          <UtensilsCrossed className="w-10 h-10" style={{ color: settings.accentColor }} />
        )}
      </div>
      <h2 className="font-display font-black text-2xl mb-2">
        {isCrops ? "لا توجد محاصيل بعد" : "المنيو فارغ"}
      </h2>
      <p className="text-sm opacity-60 max-w-sm">
        {isCrops
          ? "أضف محاصيل البن من لوحة التحكم لتظهر هنا."
          : "أضف تصنيفات ومنتجات من لوحة التحكم لتظهر قائمتك على الشاشة."}
      </p>
      </div>
    </div>
  );
};

export default MenuEmptyState;

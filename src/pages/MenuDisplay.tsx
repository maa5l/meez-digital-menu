import { useSearchParams } from "react-router-dom";
import TemplateGrid from "@/components/menu/TemplateGrid";
import TemplateSplit from "@/components/menu/TemplateSplit";
import CropsTemplateMolo from "@/components/menu/CropsTemplateMolo";
import CropsTemplatePureShelf from "@/components/menu/CropsTemplatePureShelf";
import { useMenuSettings } from "@/hooks/useMenuSettings";

/**
 * MenuDisplay — شاشة الكاشير/الجهاز.
 * بلا أي عناصر تحكم. تعرض المنيو فقط حسب إعدادات صاحب الحساب.
 * يدعم نوعين عبر query string:
 *   /menu              → منيو المنتجات
 *   /menu?type=crops   → منيو محاصيل البن
 */
const MenuDisplay = () => {
  const [params] = useSearchParams();
  const [settings] = useMenuSettings();
  const type = params.get("type") === "crops" ? "crops" : "products";
  // override القالب من الـ URL (للمعاينة السريعة بدون تغيير الإعدادات)
  const tplOverride = params.get("tpl");
  const cropsTpl =
    tplOverride === "pureshelf" || tplOverride === "molo"
      ? tplOverride
      : settings.cropsTemplate;

  return (
    <div
      className="h-screen overflow-hidden flex flex-col"
      dir="rtl"
      style={{ background: settings.bgColor, color: settings.textColor }}
    >
      {type === "crops" ? (
        cropsTpl === "molo" ? (
          <CropsTemplateMolo settings={settings} />
        ) : (
          <CropsTemplatePureShelf settings={settings} />
        )
      ) : settings.productTemplate === "grid" ? (
        <TemplateGrid settings={settings} />
      ) : (
        <TemplateSplit settings={settings} />
      )}
    </div>
  );
};

export default MenuDisplay;
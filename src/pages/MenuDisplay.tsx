import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TemplateProductsFeatured from "@/components/menu/TemplateProductsFeatured";
import TemplateProductsDetail from "@/components/menu/TemplateProductsDetail";
import CropsTemplateMolo from "@/components/menu/CropsTemplateMolo";
import CropsTemplatePureShelf from "@/components/menu/CropsTemplatePureShelf";
import { useMenuSettings } from "@/hooks/useMenuSettings";
import { UtensilsCrossed } from "lucide-react";

const genCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "QM-" + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const PENDING_KEY = "qaemah-pending-code";
const ACT_PREFIX = "qaemah-activated-";

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
  const tplOverride = params.get("tpl");
  const cropsTpl =
    tplOverride === "pureshelf" || tplOverride === "molo"
      ? tplOverride
      : settings.cropsTemplate;

  // Activation flow — معاينة المالك تتجاوز الكود
  const isPreview = params.get("preview") === "1" || !!tplOverride;
  const [code] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const existing = localStorage.getItem(PENDING_KEY);
    if (existing) return existing;
    const c = genCode();
    localStorage.setItem(PENDING_KEY, c);
    return c;
  });
  const [activated, setActivated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ACT_PREFIX + code) === "1";
  });

  useEffect(() => {
    if (isPreview || activated) return;
    const check = () => {
      if (localStorage.getItem(ACT_PREFIX + code) === "1") setActivated(true);
    };
    const t = setInterval(check, 1500);
    window.addEventListener("storage", check);
    return () => {
      clearInterval(t);
      window.removeEventListener("storage", check);
    };
  }, [code, isPreview, activated]);

  if (!isPreview && !activated) {
    return (
      <div className="h-screen bg-gradient-hero flex items-center justify-center p-6 text-primary-foreground" dir="rtl">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-accent/30 mx-auto flex items-center justify-center mb-6">
            <UtensilsCrossed className="w-10 h-10" />
          </div>
          <h1 className="font-display font-black text-3xl mb-2">جهاز جديد</h1>
          <p className="opacity-70 mb-8 text-sm">أدخل رمز التفعيل في لوحة التحكم → الأجهزة</p>
          <div className="bg-card/10 backdrop-blur border border-accent/30 rounded-3xl p-8">
            <div className="text-xs uppercase tracking-widest opacity-60 mb-3">رمز التفعيل</div>
            <div className="font-mono font-black text-5xl tracking-[0.3em]">{code}</div>
          </div>
          <p className="text-xs opacity-50 mt-6">سيتم التفعيل تلقائياً بعد إدخال الرمز</p>
        </div>
      </div>
    );
  }

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
      ) : settings.productTemplate === "detail" ? (
        <TemplateProductsDetail settings={settings} />
      ) : (
        <TemplateProductsFeatured settings={settings} />
      )}
    </div>
  );
};

export default MenuDisplay;
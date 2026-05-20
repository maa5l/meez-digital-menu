import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TemplateProductsFeatured from "@/components/menu/TemplateProductsFeatured";
import TemplateProductsDetail from "@/components/menu/TemplateProductsDetail";
import CropsTemplateMolo from "@/components/menu/CropsTemplateMolo";
import CropsTemplatePureShelf from "@/components/menu/CropsTemplatePureShelf";
import MenuEmptyState from "@/components/menu/MenuEmptyState";
import { useMenuVenue } from "@/hooks/useMenuVenue";
import { getDeviceMenuType, getDeviceMenuTypeAsync } from "@/lib/venue-store";
import {
  getOrCreatePendingDeviceCode,
  isDeviceActivated,
  isDeviceActivatedAsync,
} from "@/services/device/activation";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { appEnv } from "@/config/env";
import { getCropsPalette, getProductsPalette } from "@/lib/menu-palette";
import { UtensilsCrossed } from "lucide-react";

/**
 * شاشة عرض المنيو على الجهاز — بلا عناصر تحكم.
 */
const MenuDisplay = () => {
  const [params] = useSearchParams();
  const typeParam = params.get("type");
  const tplOverride = params.get("tpl");
  const isPreview = params.get("preview") === "1" || !!tplOverride;
  const [code] = useState(() => getOrCreatePendingDeviceCode());
  const [deviceMenuType, setDeviceMenuType] = useState<"products" | "crops" | null>(() =>
    getDeviceMenuType(code),
  );
  const type =
    typeParam === "crops" || typeParam === "products"
      ? typeParam
      : deviceMenuType ?? "products";

  useEffect(() => {
    if (typeParam === "crops" || typeParam === "products") return;
    void getDeviceMenuTypeAsync(code).then(setDeviceMenuType);
  }, [code, typeParam]);
  const [activated, setActivated] = useState(() => isDeviceActivated(code));

  const venueReady = isPreview || activated;
  const venue = useMenuVenue(venueReady ? code : null, isPreview, venueReady);
  const settings = venue.menuSettings;
  const cropsTpl =
    tplOverride === "pureshelf" || tplOverride === "molo"
      ? tplOverride
      : settings.cropsTemplate;

  useEffect(() => {
    if (isPreview || activated) return;

    const check = async () => {
      if (isDeviceActivated(code)) {
        setActivated(true);
        return;
      }
      if (isSupabaseConfigured() && !appEnv.useLocalMockAuth) {
        const remote = await isDeviceActivatedAsync(code);
        if (remote) setActivated(true);
      }
    };

    void check();
    const t = setInterval(() => void check(), 1500);
    window.addEventListener("storage", () => void check());
    return () => {
      clearInterval(t);
      window.removeEventListener("storage", () => void check());
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

  const productsEmpty = venue.products.length === 0;
  const cropsEmpty = venue.crops.length === 0;
  const pagePalette = type === "crops" ? getCropsPalette(settings) : getProductsPalette(settings);

  return (
    <div
      className="h-screen overflow-hidden flex flex-col"
      dir="rtl"
      style={{ background: pagePalette.bgColor, color: pagePalette.textColor }}
    >
      {type === "crops" ? (
        cropsEmpty ? (
          <MenuEmptyState settings={settings} type="crops" />
        ) : cropsTpl === "molo" ? (
          <CropsTemplateMolo settings={settings} crops={venue.crops} />
        ) : (
          <CropsTemplatePureShelf settings={settings} crops={venue.crops} />
        )
      ) : productsEmpty ? (
        <MenuEmptyState settings={settings} type="products" />
      ) : settings.productTemplate === "detail" ? (
        <TemplateProductsDetail
          settings={settings}
          categories={venue.categories}
          products={venue.products}
        />
      ) : (
        <TemplateProductsFeatured
          settings={settings}
          categories={venue.categories}
          products={venue.products}
        />
      )}
    </div>
  );
};

export default MenuDisplay;

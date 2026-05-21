import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import TemplateProductsFeatured from "@/components/menu/TemplateProductsFeatured";
import TemplateProductsDetail from "@/components/menu/TemplateProductsDetail";
import CropsTemplateMolo from "@/components/menu/CropsTemplateMolo";
import CropsTemplatePureShelf from "@/components/menu/CropsTemplatePureShelf";
import MenuEmptyState from "@/components/menu/MenuEmptyState";
import { IpadTrialScreen } from "@/components/device/IpadTrialScreen";
import { useMenuVenue } from "@/hooks/useMenuVenue";
import { getDeviceMenuType, getDeviceMenuTypeAsync } from "@/lib/venue-store";
import {
  checkDeviceRegistrationOnKiosk,
  getPendingDeviceCode,
  setPendingDeviceCode,
  type DeviceRegistrationStatus,
} from "@/services/device/activation";
import { normalizeDeviceCodeParam } from "@/lib/device-pairing";
import { ROUTES } from "@/config/app";
import { getCropsPalette, getProductsPalette } from "@/lib/menu-palette";

/**
 * شاشة عرض المنيو — لا تُعرض إلا بعد تسجيل الجهاز في قاعدة البيانات.
 */
const MenuDisplay = () => {
  const [params] = useSearchParams();
  const typeParam = params.get("type");
  const tplOverride = params.get("tpl");
  const isPreview = params.get("preview") === "1" || !!tplOverride;
  const codeFromParam = normalizeDeviceCodeParam(params.get("code"));

  const [code] = useState(() => {
    if (codeFromParam) {
      setPendingDeviceCode(codeFromParam);
      return codeFromParam;
    }
    return getPendingDeviceCode() ?? "";
  });

  const [registrationStatus, setRegistrationStatus] =
    useState<DeviceRegistrationStatus>(isPreview ? "registered" : "checking");
  const [activated, setActivated] = useState(isPreview);

  const [deviceMenuType, setDeviceMenuType] = useState<"products" | "crops" | null>(() =>
    code ? getDeviceMenuType(code) : null,
  );

  const type =
    typeParam === "crops" || typeParam === "products"
      ? typeParam
      : deviceMenuType ?? "products";

  useEffect(() => {
    if (typeParam === "crops" || typeParam === "products" || !code) return;
    void getDeviceMenuTypeAsync(code).then(setDeviceMenuType);
  }, [code, typeParam]);

  useEffect(() => {
    if (isPreview || !code) return;

    let cancelled = false;

    const verify = async () => {
      setRegistrationStatus("checking");
      const status = await checkDeviceRegistrationOnKiosk(code);
      if (cancelled) return;
      setRegistrationStatus(status);
      setActivated(status === "registered");
    };

    void verify();
    const interval = setInterval(() => void verify(), 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [code, isPreview]);

  if (!isPreview && !code) {
    return <Navigate to={ROUTES.pair} replace />;
  }

  if (!isPreview && !activated && code) {
    return (
      <IpadTrialScreen
        code={code}
        registrationStatus={registrationStatus}
        subtitle="المنيو يظهر بعد تفعيل هذا الرمز من لوحة التحكم"
      />
    );
  }

  const venueReady = isPreview || activated;
  const venue = useMenuVenue(venueReady ? code : null, isPreview, venueReady);
  const settings = venue.menuSettings;
  const cropsTpl =
    tplOverride === "pureshelf" || tplOverride === "molo"
      ? tplOverride
      : settings.cropsTemplate;

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

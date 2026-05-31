import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import TemplateProductsFeatured from "@/components/menu/TemplateProductsFeatured";
import TemplateProductsDetail from "@/components/menu/TemplateProductsDetail";
import CropsTemplateMolo from "@/components/menu/CropsTemplateMolo";
import CropsTemplatePureShelf from "@/components/menu/CropsTemplatePureShelf";
import MenuEmptyState from "@/components/menu/MenuEmptyState";
import { KioskSubscriptionBlocked } from "@/components/subscription/KioskSubscriptionBlocked";
import { useMenuVenue } from "@/hooks/useMenuVenue";
import { getDeviceMenuType, getDeviceMenuTypeAsync } from "@/lib/venue-store";
import {
  getPendingDeviceCode,
  setPendingDeviceCode,
} from "@/services/device/activation";
import {
  evaluateKioskGate,
  type KioskGateResult,
} from "@/services/device/kiosk-access";
import { recordDeviceHeartbeat } from "@/services/subscription/subscription-enforcement";
import { subscribeDeviceActivationChanges } from "@/services/venue/venue-realtime.service";
import { shouldUseVenueDatabase } from "@/services/venue/venue-supabase.service";
import { normalizeDeviceCodeParam } from "@/lib/device-pairing";
import { ROUTES } from "@/config/app";
import { getCropsPalette, getProductsPalette } from "@/lib/menu-palette";

/**
 * شاشة عرض المنيو — التفعيل + الاشتراك يُفرضان من الخادم (check_kiosk_access).
 */
const MenuDisplay = () => {
  const [params] = useSearchParams();
  const typeParam = params.get("type");
  const tplOverride = params.get("tpl");
  const wantsPreview = params.get("preview") === "1" || !!tplOverride;
  const codeFromParam = normalizeDeviceCodeParam(params.get("code"));

  const [code] = useState(() => {
    if (codeFromParam) {
      setPendingDeviceCode(codeFromParam);
      return codeFromParam;
    }
    return getPendingDeviceCode() ?? "";
  });

  const isPreview = wantsPreview;

  const [gate, setGate] = useState<KioskGateResult>({
    allowed: false,
    registered: false,
    registrationStatus: "checking",
  });

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
      setGate((g) => ({ ...g, registrationStatus: "checking" }));
      const result = await evaluateKioskGate(code);
      if (cancelled) return;
      setGate(result);
      if (result.allowed) {
        void recordDeviceHeartbeat(code);
      }
    };

    void verify();

    const unsubscribe = shouldUseVenueDatabase()
      ? subscribeDeviceActivationChanges(code, () => void verify())
      : () => {};

    const onVisible = () => {
      if (!document.hidden && !cancelled) void verify();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [code, isPreview]);

  const venueReady = isPreview || gate.allowed;
  const venue = useMenuVenue(venueReady ? code : null, isPreview, venueReady);

  if (!isPreview && !code) {
    return <Navigate to={ROUTES.pair} replace />;
  }

  if (!isPreview && gate.registrationStatus === "checking") {
    return (
      <KioskSubscriptionBlocked
        code={code}
        check={gate}
        registrationStatus="checking"
      />
    );
  }

  if (!isPreview && (!gate.registered || gate.reason === "device_inactive")) {
    return <Navigate to={ROUTES.pair} replace />;
  }

  if (!isPreview && gate.registered && !gate.allowed) {
    return <KioskSubscriptionBlocked code={code} check={gate} />;
  }
  const settings = venue.menuSettings;
  const cropsTpl =
    tplOverride === "pureshelf" || tplOverride === "molo"
      ? tplOverride
      : settings.cropsTemplate;

  const productsEmpty = venue.products.length === 0;
  const cropsEmpty = venue.crops.length === 0;
  const pagePalette = type === "crops" ? getCropsPalette(settings) : getProductsPalette(settings);

  const showGraceBanner =
    !isPreview && gate.access?.status === "grace_period";

  return (
    <div
      className="h-screen overflow-hidden flex flex-col"
      dir="rtl"
      style={{ background: pagePalette.bgColor, color: pagePalette.textColor }}
    >
      {showGraceBanner && (
        <div
          className="shrink-0 px-4 py-2 text-center text-sm font-semibold bg-amber-500/90 text-primary"
          role="status"
        >
          فترة سماح — أكمل الدفع من لوحة التحكم لتجنب إيقاف الشاشة
        </div>
      )}
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

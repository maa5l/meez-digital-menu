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
  KIOSK_SUBSCRIPTION_POLL_MS,
  type KioskGateResult,
} from "@/services/device/kiosk-access";
import { shouldUseVenueDatabase } from "@/services/venue/venue-supabase.service";
import { normalizeDeviceCodeParam } from "@/lib/device-pairing";
import { ROUTES } from "@/config/app";
import { useMenuLang, MenuLangProvider } from "@/context/MenuLangContext";
import { getMenuUi } from "@/lib/menu-i18n";
import { getCropsPalette, getProductsPalette } from "@/lib/menu-palette";
import { throttle } from "@/lib/throttle";

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
    };

    void verify();

    const verifyThrottled = throttle(() => void verify(), 30_000);

    const pollMs = shouldUseVenueDatabase() ? KIOSK_SUBSCRIPTION_POLL_MS : 0;
    const pollId =
      pollMs > 0
        ? window.setInterval(() => {
            if (!document.hidden && !cancelled) void verify();
          }, pollMs)
        : undefined;

    const onVisible = () => {
      if (!document.hidden && !cancelled) verifyThrottled();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (pollId != null) window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [code, isPreview]);

  const venueReady = isPreview || gate.allowed;
  const venue = useMenuVenue(
    isPreview ? null : venueReady ? code : null,
    isPreview,
    venueReady,
  );

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
    !isPreview &&
    (gate.access?.status === "grace_period" ||
      gate.subscription_status === "grace_period");

  return (
    <MenuLangProvider>
      <MenuDisplayShell
        type={type}
        settings={settings}
        cropsTpl={cropsTpl}
        productsEmpty={productsEmpty}
        cropsEmpty={cropsEmpty}
        pagePalette={pagePalette}
        showGraceBanner={showGraceBanner}
        venue={venue}
      />
    </MenuLangProvider>
  );
};

type MenuDisplayShellProps = {
  type: "products" | "crops";
  settings: ReturnType<typeof useMenuVenue>["menuSettings"];
  cropsTpl: string | undefined;
  productsEmpty: boolean;
  cropsEmpty: boolean;
  pagePalette: ReturnType<typeof getProductsPalette>;
  showGraceBanner: boolean;
  venue: ReturnType<typeof useMenuVenue>;
};

const MenuDisplayShell = ({
  type,
  settings,
  cropsTpl,
  productsEmpty,
  cropsEmpty,
  pagePalette,
  showGraceBanner,
  venue,
}: MenuDisplayShellProps) => {
  const { lang } = useMenuLang();
  const ui = getMenuUi(lang);

  return (
    <div
      className="h-screen overflow-hidden flex flex-col"
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={{ background: pagePalette.bgColor, color: pagePalette.textColor }}
    >
      {showGraceBanner && (
        <div
          className="shrink-0 px-4 py-2 text-center text-sm font-semibold bg-amber-500/90 text-primary"
          role="status"
        >
          {ui.gracePeriodBanner}
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

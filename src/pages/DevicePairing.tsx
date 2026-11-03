import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/Brand";
import { IpadTrialScreen } from "@/components/device/IpadTrialScreen";
import { isIpadTrialMode, getPublicSiteLabel } from "@/config/ipad-trial";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  getOrCreatePendingDeviceCode,
  rotatePendingDeviceCode,
  setPendingDeviceCode,
} from "@/services/device/activation";
import { announceKioskPairingCode } from "@/services/device/kiosk-pairing-announce";
import { shouldUseVenueDatabase } from "@/services/venue/venue-supabase.service";
import { normalizeDeviceCodeParam } from "@/lib/device-pairing";
import { ROUTES } from "@/config/app";
import { useDeviceRegistrationWatch } from "@/hooks/useDeviceRegistrationWatch";
import { usePairHomeScreenMeta } from "@/hooks/usePairHomeScreenMeta";

/** شاشة الآيباد — رمز التفعيل فقط؛ المنيو يفتح صامتاً بعد التسجيل */
const DevicePairing = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isPreview = params.get("preview") === "1";
  const codeFromUrl = normalizeDeviceCodeParam(params.get("code"));
  const [code, setCode] = useState<string | null>(codeFromUrl);
  const [error, setError] = useState<string | null>(null);

  // Pair-only manifest so iOS A2HS launches /pair, not marketing /.
  usePairHomeScreenMeta();

  const menuHref = useMemo(
    () => (code ? `${ROUTES.menu}?code=${encodeURIComponent(code)}` : ROUTES.pair),
    [code],
  );

  useEffect(() => {
    if (codeFromUrl) {
      try {
        setPendingDeviceCode(codeFromUrl);
        setCode(codeFromUrl);
        setError(null);
      } catch {
        setError("رابط غير صالح");
        setCode(null);
      }
      return;
    }
    // Always keep /pair on the activation screen with a local code — never bounce to marketing home.
    const generated = getOrCreatePendingDeviceCode();
    setCode(generated);
    setError(null);
  }, [codeFromUrl]);

  useDeviceRegistrationWatch(code, {
    enabled: Boolean(code) && !isPreview,
    onRegistered: () => navigate(menuHref, { replace: true }),
    onDeactivated: () => {
      // يُستدعى فقط بعد wasRegistered → not_registered من الـ hook
      const next = rotatePendingDeviceCode();
      setCode(next);
    },
  });

  useEffect(() => {
    if (!code || isPreview || !shouldUseVenueDatabase()) return;
    void announceKioskPairingCode(code);
    const announceId = window.setInterval(() => {
      void announceKioskPairingCode(code);
    }, 30_000);
    return () => window.clearInterval(announceId);
  }, [code, isPreview]);

  if (error && !code) {
    return (
      <div
        className="min-h-screen bg-gradient-hero flex items-center justify-center p-6 text-primary-foreground"
        dir="rtl"
      >
        <div className="max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-accent" />
          <h1 className="font-display font-black text-2xl">رابط غير صالح</h1>
          <p className="text-sm opacity-70">{error}</p>
        </div>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center text-primary-foreground" dir="rtl">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (isIpadTrialMode || isPreview) {
    return (
      <IpadTrialScreen
        code={code}
        preview={isPreview}
        subtitle={
          isPreview
            ? "هذه معاينة شاشة الآيباد من لوحة التحكم"
            : "من لوحة التحكم → تطبيق الآيباد → أدخل هذا الرمز وفعّل الجهاز"
        }
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center p-6 text-primary-foreground"
      dir="rtl"
    >
      <div className="relative w-full max-w-lg text-center">
        <Logo className="h-16 w-auto aspect-[1031/736] mx-auto mb-6" />
        <h1 className="font-display font-black text-3xl mb-2">رمز التفعيل</h1>
        <div className="font-mono font-black text-5xl tracking-[0.35em] mb-6" dir="ltr">
          {code}
        </div>
        <p className="text-sm opacity-70 mb-8">فعّل هذا الرمز من لوحة التحكم</p>
        <p className="text-lg font-semibold text-accent/80" dir="ltr">
          {getPublicSiteLabel()}
        </p>
      </div>
    </div>
  );
};

export default DevicePairing;

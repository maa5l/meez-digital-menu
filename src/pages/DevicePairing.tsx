import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/Brand";
import { IpadTrialScreen } from "@/components/device/IpadTrialScreen";
import { isIpadTrialMode } from "@/config/ipad-trial";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  checkDeviceRegistrationOnKiosk,
  getOrCreatePendingDeviceCode,
  getPendingDeviceCode,
  setPendingDeviceCode,
  type DeviceRegistrationStatus,
} from "@/services/device/activation";
import { normalizeDeviceCodeParam } from "@/lib/device-pairing";
import { ROUTES } from "@/config/app";

/**
 * شاشة الآيباد — رمز التفعيل وحالة التسجيل. المنيو يفتح فقط بعد التسجيل في قاعدة البيانات.
 */
const DevicePairing = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isPreview = params.get("preview") === "1";
  const codeFromUrl = normalizeDeviceCodeParam(params.get("code"));
  const [code, setCode] = useState<string | null>(codeFromUrl);
  const [error, setError] = useState<string | null>(null);
  const [registrationStatus, setRegistrationStatus] =
    useState<DeviceRegistrationStatus>("checking");

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
    if (isIpadTrialMode) {
      const generated = getOrCreatePendingDeviceCode();
      setCode(generated);
      setError(null);
      return;
    }
    const pending = getPendingDeviceCode();
    if (pending) {
      setCode(pending);
      setError(null);
      return;
    }
    setError("افتح الرابط من لوحة التحكم");
    setCode(null);
  }, [codeFromUrl]);

  useEffect(() => {
    if (!code || isPreview) return;

    let cancelled = false;

    const verify = async () => {
      setRegistrationStatus("checking");
      const status = await checkDeviceRegistrationOnKiosk(code);
      if (cancelled) return;
      setRegistrationStatus(status);
      if (status === "registered") {
        navigate(menuHref, { replace: true });
      }
    };

    void verify();
    const interval = setInterval(() => void verify(), 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [code, isPreview, menuHref, navigate]);

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
        registrationStatus={isPreview ? "not_registered" : registrationStatus}
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
        <p className="text-sm opacity-70">
          {registrationStatus === "registered"
            ? "الجهاز مسجّل — جاري فتح المنيو…"
            : "في انتظار التفعيل من لوحة التحكم"}
        </p>
      </div>
    </div>
  );
};

export default DevicePairing;

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/Brand";
import { AlertCircle, Loader2, MonitorSmartphone } from "lucide-react";
import {
  isDeviceActivated,
  isDeviceActivatedAsync,
  setPendingDeviceCode,
} from "@/services/device/activation";
import { normalizePairingSessionParam } from "@/lib/device-pairing";
import { registerCodeOnPairingSession } from "@/services/device/pairing-session.service";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { appEnv } from "@/config/env";
import { ROUTES } from "@/config/app";

/**
 * شاشة ربط الآيباد — يُولَّد الرمز هنا فقط بعد فتح رابط QR (?sid=...).
 */
const DevicePairing = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = normalizePairingSessionParam(params.get("sid"));
  const [code, setCode] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    void (async () => {
      try {
        const generated = await registerCodeOnPairingSession(sessionId);
        if (cancelled) return;
        setPendingDeviceCode(generated);
        setCode(generated);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "تعذّر تجهيز جلسة الربط");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const menuHref = useMemo(
    () => (code ? `${ROUTES.menu}?code=${encodeURIComponent(code)}` : ROUTES.menu),
    [code],
  );

  useEffect(() => {
    if (!code || activated) return;

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
    const interval = setInterval(() => void check(), 1500);
    const onStorage = () => void check();
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
    };
  }, [code, activated]);

  useEffect(() => {
    if (activated && code) {
      navigate(menuHref, { replace: true });
    }
  }, [activated, code, menuHref, navigate]);

  if (!sessionId) {
    return (
      <div
        className="min-h-screen bg-gradient-hero flex items-center justify-center p-6 text-primary-foreground"
        dir="rtl"
      >
        <div className="max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-accent" />
          <h1 className="font-display font-black text-2xl">رابط غير صالح</h1>
          <p className="text-sm opacity-70">افتح الرابط من رمز QR في لوحة التحكم → الأجهزة</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6 text-primary-foreground" dir="rtl">
        <div className="max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <p className="text-sm">{loadError}</p>
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

  if (activated) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center text-primary-foreground" dir="rtl">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center p-6 text-primary-foreground"
      dir="rtl"
    >
      <div className="absolute -top-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-accent/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[32rem] h-[32rem] rounded-full bg-accent/15 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg text-center">
        <Logo className="h-16 w-auto aspect-[1031/736] mx-auto mb-6 animate-float" />

        <div className="w-14 h-14 rounded-2xl bg-accent/25 mx-auto flex items-center justify-center mb-4">
          <MonitorSmartphone className="w-7 h-7" />
        </div>

        <h1 className="font-display font-black text-3xl md:text-4xl mb-2">ربط الآيباد</h1>
        <p className="text-primary-foreground/70 text-sm mb-8 max-w-sm mx-auto">
          من لوحة التحكم → <strong className="text-primary-foreground">الأجهزة</strong> فعّل هذا الرمز
          (ضمن عدد الشاشات في اشتراكك)
        </p>

        <div className="bg-card/10 backdrop-blur border-2 border-accent/40 rounded-[2rem] p-8 md:p-10 shadow-warm">
          <div className="text-xs uppercase tracking-[0.25em] text-accent font-bold mb-3">رمز التفعيل</div>
          <div
            className="font-mono font-black text-5xl md:text-6xl tracking-[0.35em] text-primary-foreground mb-4"
            dir="ltr"
          >
            {code}
          </div>
          <p className="text-xs text-primary-foreground/50 flex items-center justify-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            في انتظار التفعيل من لوحة التحكم…
          </p>
        </div>
      </div>
    </div>
  );
};

export default DevicePairing;

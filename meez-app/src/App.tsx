import { useCallback, useEffect, useState } from "react";
import { PairScreen } from "@/components/PairScreen";
import { getMenuUrlForCode, isSupabaseConfigured } from "@/config/env";
import { resolveDeviceCodeFromUrl } from "@/services/device-code";
import { checkDeviceRegisteredOnServer, verifyKioskAccessBeforeMenu } from "@/services/kiosk-check";
import { useDeviceRegistrationWatch } from "@/hooks/useDeviceRegistrationWatch";
import { logger } from "@/lib/logger";

function getCodeFromLaunchUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get("code");
  } catch {
    return null;
  }
}

const App = () => {
  const [code, setCode] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [openingMenu, setOpeningMenu] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resolved = await resolveDeviceCodeFromUrl(getCodeFromLaunchUrl());
        if (!cancelled) setCode(resolved);
      } catch (err) {
        if (!cancelled) {
          setBootError(err instanceof Error ? err.message : "تعذّر تحميل رمز الجهاز");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openMenu = useCallback(async (deviceCode: string) => {
    if (openingMenu) return;
    setOpeningMenu(true);

    try {
      const peek = await checkDeviceRegisteredOnServer(deviceCode);
      if (peek !== "registered") {
        logger.warn("app.open_menu_not_ready", { code: deviceCode });
        setOpeningMenu(false);
        return;
      }

      await verifyKioskAccessBeforeMenu(deviceCode);

      const url = getMenuUrlForCode(deviceCode);
      logger.audit("app.open_menu", { url, code: deviceCode });
      window.location.replace(url);
    } catch (err) {
      logger.error("app.open_menu_failed", {
        code: deviceCode,
        message: err instanceof Error ? err.message : String(err),
      });
      setOpeningMenu(false);
    }
  }, [openingMenu]);

  useDeviceRegistrationWatch(code, {
    enabled: isSupabaseConfigured() && !openingMenu,
    onRegistered: (deviceCode) => void openMenu(deviceCode),
  });

  if (bootError) {
    return (
      <div className="min-h-[100dvh] bg-gradient-hero flex items-center justify-center p-6 text-primary-foreground" dir="rtl">
        <p className="text-center text-sm opacity-80">{bootError}</p>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="min-h-[100dvh] bg-gradient-hero flex items-center justify-center text-primary-foreground" dir="rtl">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-[100dvh] bg-gradient-hero flex items-center justify-center p-6 text-primary-foreground" dir="rtl">
        <div className="max-w-md text-center space-y-3">
          <p className="font-bold text-lg">Supabase غير مضبوط</p>
          <p className="text-sm opacity-80">
            أنشئ ملف <span dir="ltr">meez-app/.env.local</span> وانسخ مفاتيح Supabase من لوحة التحكم.
          </p>
        </div>
      </div>
    );
  }

  return <PairScreen code={code} />;
};

export default App;

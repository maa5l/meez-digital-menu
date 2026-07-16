import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { MenuWebView } from "@/components/MenuWebView";
import { AppShell, APP_BACKGROUND } from "@/components/AppShell";
import { PairScreen } from "@/components/PairScreen";
import { getMenuUrlForCode, isSupabaseConfigured } from "@/config/env";
import { resolveDeviceCodeFromUrl } from "@/services/device-code";
import {
  peekDeviceRegistration,
  type RegistrationPeek,
  verifyKioskAccessBeforeMenu,
} from "@/services/kiosk-check";
import { useDeviceRegistrationWatch } from "@/hooks/useDeviceRegistrationWatch";
import { announceKioskPairingCode } from "@/services/kiosk-pairing";
import { logger } from "@/lib/logger";

const App = () => {
  const [code, setCode] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [openingMenu, setOpeningMenu] = useState(false);
  const [menuUrl, setMenuUrl] = useState<string | null>(null);
  const [peek, setPeek] = useState<RegistrationPeek | null>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resolved = await resolveDeviceCodeFromUrl(null);
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
      const status = await peekDeviceRegistration(deviceCode, true);
      setPeek(status);
      if (status.status !== "registered") {
        logger.warn("app.open_menu_not_ready", { code: deviceCode, status });
        setOpeningMenu(false);
        return;
      }

      await verifyKioskAccessBeforeMenu(deviceCode);

      const url = getMenuUrlForCode(deviceCode);
      logger.audit("app.open_menu", { url, code: deviceCode });
      setMenuUrl(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("app.open_menu_failed", { code: deviceCode, message });
      setPeek({ status: "error", message });
      setOpeningMenu(false);
    }
  }, [openingMenu]);

  useEffect(() => {
    if (!code || !isSupabaseConfigured()) return;

    void announceKioskPairingCode(code);

    const refreshId = setInterval(() => {
      void announceKioskPairingCode(code);
    }, 10 * 60 * 1000);

    return () => clearInterval(refreshId);
  }, [code]);

  useDeviceRegistrationWatch(code, {
    enabled: isSupabaseConfigured() && !openingMenu && !menuUrl,
    onStatus: setPeek,
    onRegistered: (deviceCode) => void openMenu(deviceCode),
  });

  const immersive = Boolean(menuUrl);

  let content: ReactNode;

  if (menuUrl) {
    content = <MenuWebView menuUrl={menuUrl} />;
  } else if (bootError) {
    content = (
      <View style={styles.centered}>
        <Text style={styles.centerText}>{bootError}</Text>
      </View>
    );
  } else if (!code) {
    content = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#c4a35a" />
      </View>
    );
  } else if (!isSupabaseConfigured()) {
    content = (
      <View style={styles.centered}>
        <View style={styles.box}>
          <Text style={styles.title}>Supabase غير مضبوط</Text>
          <Text style={styles.centerText}>
            عيّن EXPO_PUBLIC_SUPABASE_URL و EXPO_PUBLIC_SUPABASE_ANON_KEY في ملف .env
          </Text>
        </View>
      </View>
    );
  } else {
    content = <PairScreen code={code} peek={peek} openingMenu={openingMenu} />;
  }

  return (
    <AppShell immersive={immersive}>
      {content}
    </AppShell>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: APP_BACKGROUND,
  },
  centered: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  box: {
    maxWidth: 420,
    gap: 12,
  },
  title: {
    color: "#f8f1e4",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  centerText: {
    color: "rgba(248,241,228,0.8)",
    fontSize: 14,
    textAlign: "center",
  },
});

export default App;

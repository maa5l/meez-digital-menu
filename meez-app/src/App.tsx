import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";
import { PairScreen } from "@/components/PairScreen";
import { getMenuUrlForCode, isSupabaseConfigured } from "@/config/env";
import { resolveDeviceCodeFromUrl } from "@/services/device-code";
import {
  peekDeviceRegistration,
  type RegistrationPeek,
  verifyKioskAccessBeforeMenu,
} from "@/services/kiosk-check";
import { useDeviceRegistrationWatch } from "@/hooks/useDeviceRegistrationWatch";
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

  useDeviceRegistrationWatch(code, {
    enabled: isSupabaseConfigured() && !openingMenu && !menuUrl,
    onStatus: setPeek,
    onRegistered: (deviceCode) => void openMenu(deviceCode),
  });

  if (menuUrl) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" hidden />
        <WebView
          source={{ uri: menuUrl }}
          style={styles.webview}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
        />
      </View>
    );
  }

  if (bootError) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <Text style={styles.centerText}>{bootError}</Text>
      </View>
    );
  }

  if (!code) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#c4a35a" />
      </View>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.box}>
          <Text style={styles.title}>Supabase غير مضبوط</Text>
          <Text style={styles.centerText}>
            عيّن EXPO_PUBLIC_SUPABASE_URL و EXPO_PUBLIC_SUPABASE_ANON_KEY في ملف .env
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <PairScreen code={code} peek={peek} openingMenu={openingMenu} />
    </>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1a1510",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  webview: {
    flex: 1,
    width: "100%",
    backgroundColor: "#1a1510",
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

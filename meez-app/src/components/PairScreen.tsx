import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Logo } from "@/components/Brand";
import {
  getMenuWebBaseUrl,
  isLocalhostMenuUrl,
} from "@/config/env";
import { describeRegistrationStatus } from "@/lib/status-messages";
import type { RegistrationPeek } from "@/services/kiosk-check";

type Props = {
  code: string;
  peek?: RegistrationPeek | null;
  openingMenu?: boolean;
};

export function PairScreen({ code, peek = null, openingMenu = false }: Props) {
  const [showCode, setShowCode] = useState(false);
  const status = describeRegistrationStatus(peek, openingMenu);
  const isError = peek?.status === "error";

  useEffect(() => {
    const t = setTimeout(() => setShowCode(true), 2200);
    return () => clearTimeout(t);
  }, []);

  if (!showCode) {
    return (
      <View style={styles.root}>
        <Logo size={120} />
        <Text style={styles.introBrand}>Meez</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Logo size={56} />
        <Text style={styles.eyebrow}>رمز التفعيل</Text>
        <Text style={styles.code} accessibilityLabel={`رمز التفعيل ${code}`}>
          {code}
        </Text>

        <View style={[styles.statusBox, isError && styles.statusBoxError]}>
          <Text style={[styles.statusTitle, isError && styles.statusError]}>
            {status.title}
          </Text>
          <Text style={styles.statusMessage}>{status.message}</Text>
          {status.hint ? <Text style={styles.statusHint}>{status.hint}</Text> : null}
        </View>

        {__DEV__ && (
          <View style={styles.devBox}>
            <Text style={styles.devText}>menu: {getMenuWebBaseUrl()}/menu?code={code}</Text>
            {isLocalhostMenuUrl() && (
              <Text style={styles.devWarn}>
                localhost لا يعمل بين جهازين — استخدم IP الشبكة في EXPO_PUBLIC_MENU_WEB_URL
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#1a1510",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  introBrand: {
    color: "#f8f1e4",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 2,
  },
  card: {
    width: "100%",
    flexGrow: 0,
    alignItems: "center",
  },
  eyebrow: {
    marginTop: 28,
    marginBottom: 12,
    fontSize: 12,
    letterSpacing: 4,
    fontWeight: "700",
    color: "#c4a35a",
    textTransform: "uppercase",
  },
  code: {
    fontFamily: "monospace",
    fontWeight: "900",
    fontSize: 48,
    letterSpacing: 10,
    color: "#f8f1e4",
    marginBottom: 20,
  },
  statusBox: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.22)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  statusBoxError: {
    borderColor: "rgba(246,213,138,0.35)",
    backgroundColor: "rgba(246,213,138,0.08)",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8f1e4",
    textAlign: "center",
  },
  statusMessage: {
    fontSize: 14,
    color: "rgba(248,241,228,0.85)",
    textAlign: "center",
    lineHeight: 22,
  },
  statusHint: {
    fontSize: 12,
    color: "rgba(196,163,90,0.95)",
    textAlign: "center",
    lineHeight: 18,
  },
  statusError: {
    color: "#f6d58a",
  },
  devBox: {
    marginTop: 32,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(0,0,0,0.25)",
    alignSelf: "stretch",
  },
  devText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "monospace",
  },
  devWarn: {
    marginTop: 8,
    fontSize: 11,
    color: "#f6d58a",
  },
});

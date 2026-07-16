import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Logo } from "@/components/Brand";
import {
  getMenuWebBaseUrl,
  isLocalhostMenuUrl,
} from "@/config/env";
import type { RegistrationPeek } from "@/services/kiosk-check";

type Props = {
  code: string;
  peek?: RegistrationPeek | null;
  openingMenu?: boolean;
};

function statusLabel(peek: RegistrationPeek | null | undefined, openingMenu: boolean): string {
  if (openingMenu) return "جاري فتح المنيو…";
  if (!peek || peek.status === "checking") return "جاري التحقق من التفعيل…";
  if (peek.status === "registered") return "تم التفعيل — جاري التحويل…";
  if (peek.status === "error") {
    if (peek.reason === "rate_limited") {
      const sec = peek.retry_after_seconds;
      return sec
        ? `محاولات كثيرة — انتظر ${sec} ثانية`
        : "محاولات كثيرة — انتظر قليلاً";
    }
    return peek.message ? `خطأ الاتصال: ${peek.message}` : "تعذّر الاتصال بـ Supabase";
  }
  if (peek.reason === "device_not_registered") {
    return "بانتظار التفعيل من لوحة التحكم → الأجهزة";
  }
  if (peek.reason) {
    return `الجهاز غير مسموح حالياً (${peek.reason})`;
  }
  return "بانتظار التفعيل من لوحة التحكم → الأجهزة";
}

export function PairScreen({ code, peek = null, openingMenu = false }: Props) {
  const [showCode, setShowCode] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowCode(true), 900);
    return () => clearTimeout(t);
  }, []);

  if (!showCode) {
    return (
      <View style={styles.root}>
        <Logo size={96} />
      </View>
    );
  }

  const label = statusLabel(peek, openingMenu);
  const isError = peek?.status === "error";

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Logo size={56} />
        <Text style={styles.eyebrow}>رمز التفعيل</Text>
        <Text style={styles.code} accessibilityLabel={`رمز التفعيل ${code}`}>
          {code}
        </Text>
        <Text style={[styles.status, isError && styles.statusError]}>{label}</Text>
        <Text style={styles.hint}>
          انسخ الرمز أعلاه إلى لوحة التحكم → الأجهزة → تفعيل جهاز
        </Text>
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
  status: {
    fontSize: 15,
    color: "rgba(248,241,228,0.85)",
    textAlign: "center",
    marginBottom: 16,
    maxWidth: 420,
  },
  statusError: {
    color: "#f6d58a",
  },
  hint: {
    fontSize: 14,
    color: "rgba(248,241,228,0.65)",
    textAlign: "center",
    marginBottom: 24,
    maxWidth: 360,
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

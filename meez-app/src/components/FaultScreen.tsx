import { Pressable, StyleSheet, Text, View } from "react-native";
import { Logo } from "@/components/Brand";
import type { Fault } from "@/kiosk/types";

type Props = {
  fault: Fault;
  onRetry: () => void;
  onUnlink: () => void;
};

export function FaultScreen({ fault, onRetry, onUnlink }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Logo size={56} />
        <Text style={styles.codeLabel}>{fault.code}</Text>
        <Text style={styles.title}>{fault.message}</Text>
        {fault.detail ? <Text style={styles.detail}>{fault.detail}</Text> : null}

        <Pressable style={styles.primaryBtn} onPress={onRetry}>
          <Text style={styles.primaryText}>إعادة محاولة</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={onUnlink}>
          <Text style={styles.secondaryText}>إلغاء ربط الجهاز</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    gap: 12,
  },
  codeLabel: {
    marginTop: 8,
    color: "rgba(196,163,90,0.9)",
    fontSize: 12,
    fontFamily: "monospace",
    letterSpacing: 1,
  },
  title: {
    color: "#f8f1e4",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 28,
  },
  detail: {
    color: "rgba(248,241,228,0.7)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 16,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#7B4A32",
    alignItems: "center",
  },
  primaryText: {
    color: "#f8f1e4",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(248,241,228,0.25)",
    alignItems: "center",
  },
  secondaryText: {
    color: "rgba(248,241,228,0.9)",
    fontSize: 15,
    fontWeight: "600",
  },
});

import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { MenuWebView } from "@/components/MenuWebView";
import { AppShell } from "@/components/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FaultScreen } from "@/components/FaultScreen";
import { PairScreen } from "@/components/PairScreen";
import { isSupabaseConfigured } from "@/config/env";
import { describeConfigError } from "@/lib/status-messages";
import { KioskProvider, useKiosk } from "@/kiosk/KioskContext";
import { kioskSupervisor } from "@/kiosk/KioskSupervisor";
import { faultFromCode } from "@/kiosk/fault-copy";

function KioskRoot() {
  const { snapshot, supervisor } = useKiosk();
  const { phase, code, menuUrl, fault, peek, remountKey, bootError } = snapshot;

  const immersive = phase === "menu";

  let content = null;

  if (phase === "fault" && fault) {
    content = (
      <FaultScreen
        fault={fault}
        onRetry={() => {
          if (fault.code === "STORAGE") void supervisor.restart();
          else supervisor.retry();
        }}
        onUnlink={() => supervisor.unlinkLocal()}
      />
    );
  } else if (bootError) {
    content = (
      <FaultScreen
        fault={faultFromCode("STORAGE", bootError)}
        onRetry={() => void supervisor.restart()}
        onUnlink={() => supervisor.unlinkLocal()}
      />
    );
  } else if (phase === "boot" || !code) {
    content = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#c4a35a" />
      </View>
    );
  } else if (!isSupabaseConfigured()) {
    const detail = describeConfigError();
    content = (
      <View style={styles.centered}>
        <View style={styles.box}>
          <Text style={styles.title}>{detail.title}</Text>
          <Text style={styles.centerText}>{detail.message}</Text>
          {detail.hint ? <Text style={styles.hintText}>{detail.hint}</Text> : null}
        </View>
      </View>
    );
  } else if (phase === "menu" && menuUrl) {
    content = (
      <MenuWebView
        key={remountKey}
        menuUrl={menuUrl}
        onRetry={() => supervisor.retry()}
        onLoadBlank={() => supervisor.onLoadBlank()}
        onFatalLoadError={() => supervisor.reportFault("NETWORK")}
        onWebMessage={(raw) => supervisor.onWebMessage(raw)}
      />
    );
  } else {
    content = (
      <PairScreen code={code} peek={peek} openingMenu={phase === "opening"} />
    );
  }

  return <AppShell immersive={immersive}>{content}</AppShell>;
}

const App = () => {
  return (
    <ErrorBoundary onReset={() => kioskSupervisor.unlinkLocal()}>
      <KioskProvider>
        <KioskRoot />
      </KioskProvider>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
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
  hintText: {
    color: "rgba(196,163,90,0.95)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});

export default App;

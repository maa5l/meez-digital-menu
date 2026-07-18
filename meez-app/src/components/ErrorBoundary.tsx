import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { APP_BACKGROUND } from "@/components/AppShell";
import { logger } from "@/lib/logger";

type Props = {
  children: ReactNode;
  onReset?: () => void;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error("app.error_boundary", {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  private handleReset = (): void => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <View style={styles.root}>
          <Text style={styles.title}>حدث خطأ غير متوقع</Text>
          <Text style={styles.detail}>
            {this.state.error.message || "تعذّر عرض الواجهة. أعد المحاولة أو ألغِ ربط الجهاز."}
          </Text>
          <Pressable style={styles.btn} onPress={this.handleReset}>
            <Text style={styles.btnText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    color: "#f8f1e4",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  detail: {
    color: "rgba(248,241,228,0.8)",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 420,
  },
  btn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#7B4A32",
  },
  btnText: {
    color: "#f8f1e4",
    fontSize: 15,
    fontWeight: "600",
  },
});

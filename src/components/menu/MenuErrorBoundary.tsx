import { Component, type ErrorInfo, type ReactNode } from "react";
import { UserErrorPanel } from "@/components/UserErrorPanel";
import { postKioskFault } from "@/lib/kiosk-bridge";
import { logger } from "@/lib/logger";
import { classifyUserFacingError } from "@/lib/user-facing-errors";

type Props = {
  children: ReactNode;
  onRetry?: () => void;
};

type State = {
  error: Error | null;
};

/** Catches SPA render crashes so the kiosk shell can show FaultScreen via postMessage. */
export class MenuErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error("menu.error_boundary", {
      message: error.message,
      componentStack: info.componentStack,
    });
    postKioskFault("SCHEMA", error.message);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.error) {
      // لا نفرض SCHEMA دائماً — بعض الأعطال عابرة (شبكة/كاش) وتُصنَّف أفضل تلقائياً
      const detail = classifyUserFacingError(this.state.error);
      const panel =
        detail.category === "unknown"
          ? classifyUserFacingError(this.state.error, { faultCode: "SCHEMA" })
          : detail;
      return (
        <div className="flex h-screen flex-col items-center justify-center" style={{ background: "#1a1510", color: "#f8f1e4" }}>
          <UserErrorPanel error={panel} onRetry={this.handleRetry} className="text-[#f8f1e4]" />
        </div>
      );
    }

    return this.props.children;
  }
}

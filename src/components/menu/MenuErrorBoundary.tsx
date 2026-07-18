import { Component, type ErrorInfo, type ReactNode } from "react";
import { postKioskFault } from "@/lib/kiosk-bridge";
import { logger } from "@/lib/logger";

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
      return (
        <div
          className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center"
          style={{ background: "#1a1510", color: "#f8f1e4" }}
          dir="rtl"
        >
          <p className="text-lg font-bold">خطأ برمجي في بنية بيانات المنتجات.</p>
          <p className="max-w-md text-sm opacity-80">{this.state.error.message}</p>
          <button
            type="button"
            className="rounded-xl px-6 py-3 text-sm font-semibold"
            style={{ background: "#7B4A32" }}
            onClick={this.handleRetry}
          >
            إعادة محاولة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

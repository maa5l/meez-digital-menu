/** Bridge: Vite menu SPA → Expo WebView shell */

export type KioskBridgeFaultCode =
  | "MENU_EMPTY"
  | "SCHEMA"
  | "NETWORK"
  | "LOAD_BLANK"
  | "STORAGE"
  | "MEDIA_DEGRADED";

type ReactNativeWebView = {
  postMessage: (message: string) => void;
};

function getNativeBridge(): ReactNativeWebView | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as Window & { ReactNativeWebView?: ReactNativeWebView }).ReactNativeWebView;
  return bridge ?? null;
}

export function postKioskReady(extra?: { empty?: boolean }): void {
  const bridge = getNativeBridge();
  if (!bridge) return;
  bridge.postMessage(
    JSON.stringify({
      type: "meez:kiosk-ready",
      empty: Boolean(extra?.empty),
      at: Date.now(),
    }),
  );
}

export function postKioskFault(code: KioskBridgeFaultCode, detail?: string): void {
  const bridge = getNativeBridge();
  if (!bridge) return;
  bridge.postMessage(
    JSON.stringify({
      type: "meez:kiosk-fault",
      code,
      detail,
      at: Date.now(),
    }),
  );
}

export function isEmbeddedInKioskWebView(): boolean {
  return getNativeBridge() != null;
}

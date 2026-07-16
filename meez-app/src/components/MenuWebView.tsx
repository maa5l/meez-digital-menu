import { useCallback, useMemo, useRef } from "react";
import { Platform, StyleSheet } from "react-native";
import {
  WebView,
  type WebViewNavigation,
  type WebViewProps,
} from "react-native-webview";
import { APP_BACKGROUND } from "@/components/AppShell";
import { logger } from "@/lib/logger";
import { getTrustedMenuOrigins, isAllowedMenuNavigation } from "@/lib/trusted-menu-origin";

const KIOSK_INJECTED_JS = `
(function () {
  if (window.__MEEZ_KIOSK_GUARD__) return;
  window.__MEEZ_KIOSK_GUARD__ = true;

  var blockedOpen = function () { return null; };
  window.open = blockedOpen;
  window.print = blockedOpen;

  document.addEventListener(
    "click",
    function (event) {
      var node = event.target;
      while (node && node.tagName !== "A") node = node.parentElement;
      if (!node || node.tagName !== "A") return;
      if (node.target === "_blank" || node.target === "_new") {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );
})();
true;
`;

type Props = {
  menuUrl: string;
};

export function MenuWebView({ menuUrl }: Props) {
  const trustedOrigins = useMemo(() => getTrustedMenuOrigins(), []);
  const lastAllowedUrl = useRef(menuUrl);

  const shouldStartLoad = useCallback<NonNullable<WebViewProps["onShouldStartLoadWithRequest"]>>(
    (request) => {
      const allowed = isAllowedMenuNavigation(request.url, trustedOrigins);
      if (!allowed) {
        logger.warn("webview.navigation_blocked", {
          url: request.url,
          isTopFrame: request.isTopFrame,
        });
        return false;
      }
      lastAllowedUrl.current = request.url;
      return true;
    },
    [trustedOrigins],
  );

  const onNavigationStateChange = useCallback(
    (nav: WebViewNavigation) => {
      if (!nav.url || nav.url === "about:blank") return;
      if (!isAllowedMenuNavigation(nav.url, trustedOrigins)) {
        logger.warn("webview.navigation_revert", { url: nav.url });
      }
    },
    [trustedOrigins],
  );

  return (
    <WebView
      source={{ uri: menuUrl }}
      style={styles.fill}
      originWhitelist={trustedOrigins.map((origin) => `${origin}*`)}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      setSupportMultipleWindows={false}
      javaScriptCanOpenWindowsAutomatically={false}
      thirdPartyCookiesEnabled={false}
      sharedCookiesEnabled={false}
      overScrollMode="never"
      androidLayerType="hardware"
      injectedJavaScriptBeforeContentLoaded={KIOSK_INJECTED_JS}
      onShouldStartLoadWithRequest={shouldStartLoad}
      onNavigationStateChange={onNavigationStateChange}
      onOpenWindow={(event) => {
        logger.warn("webview.open_window_blocked", { url: event.nativeEvent.targetUrl });
      }}
      setBuiltInZoomControls={false}
      displayZoomControls={false}
      allowsBackForwardNavigationGestures={false}
      pullToRefreshEnabled={false}
      cacheEnabled
      domStorageEnabled
      javaScriptEnabled
      onHttpError={(e) => {
        logger.error("webview.http_error", {
          statusCode: e.nativeEvent.statusCode,
          url: e.nativeEvent.url,
        });
      }}
      {...(Platform.OS === "android"
        ? {
            mixedContentMode: "never" as const,
          }
        : {})}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: APP_BACKGROUND,
  },
});

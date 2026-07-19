import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewNavigation,
  type WebViewProps,
} from "react-native-webview";
import { APP_BACKGROUND } from "@/components/AppShell";
import { logger } from "@/lib/logger";
import { classifyUserFacingError } from "@/lib/user-facing-errors";
import { isBlockedMenuUrl } from "@/lib/blocked-menu-hosts";
import { getTrustedMenuOrigins, isAllowedMenuNavigation } from "@/lib/trusted-menu-origin";

/** Spec baseline 5s; allow headroom for gate RPC + catalog fetch after HTML onLoadEnd */
const READY_ACK_MS = 12_000;
const HARD_TIMEOUT_MS = 25_000;
const LOAD_AUTO_RETRY_MS = 8_000;

const KIOSK_BG_INJECTED_JS = `
(function () {
  var bg = "#F6F2EA";
  document.documentElement.style.backgroundColor = bg;
  document.body.style.backgroundColor = bg;
})();
true;
`;

const KIOSK_SOFT_REFRESH_JS = `
(function () {
  window.dispatchEvent(new Event("meez:menu-kiosk-reset"));
})();
true;
`;

const KIOSK_GUARD_INJECTED_JS = `
(function () {
  if (window.__MEEZ_KIOSK_GUARD__) return;
  window.__MEEZ_KIOSK_GUARD__ = true;

  var blockedOpen = function () { return null; };
  window.open = blockedOpen;
  window.print = blockedOpen;

  var allowedOrigin = window.location.origin;
  function isExternal(url) {
    try {
      return new URL(url, window.location.href).origin !== allowedOrigin;
    } catch (e) {
      return true;
    }
  }

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
      try {
        if (node.href && isExternal(node.href)) {
          event.preventDefault();
          event.stopPropagation();
        }
      } catch (e) {}
    },
    true,
  );
})();
true;
`;

type LoadError = {
  title: string;
  detail: string;
};

type Props = {
  menuUrl: string;
  onRetry?: () => void;
  /** Handshake missing after onLoadEnd */
  onLoadBlank?: () => void;
  /** Native/network load failures after retries */
  onFatalLoadError?: () => void;
  /** Forward raw postMessage payloads to supervisor */
  onWebMessage?: (raw: string) => void;
};

function describeLoadError(statusCode: number | undefined, url: string): LoadError {
  if (isBlockedMenuUrl(url)) {
    return {
      title: "النطاق محجوز",
      detail: "عنوان المنيو يشير إلى صفحة إعلانات وليس تطبيق قائمة.",
    };
  }
  if (statusCode === 404) {
    return { title: "الصفحة غير موجودة", detail: "تأكد من نشر المنيو على العنوان الصحيح." };
  }

  const classified = classifyUserFacingError(
    statusCode && statusCode >= 500 ? `HTTP ${statusCode}` : "network request failed",
    { faultCode: statusCode && statusCode >= 500 ? undefined : "NETWORK" },
  );

  return {
    title: classified.title,
    detail: classified.message,
  };
}

export function MenuWebView({
  menuUrl,
  onRetry,
  onLoadBlank,
  onFatalLoadError,
  onWebMessage,
}: Props) {
  const trustedOrigins = useMemo(() => getTrustedMenuOrigins(), []);
  const webViewRef = useRef<WebView>(null);
  const failCountRef = useRef(0);
  const readyReceivedRef = useRef(false);
  const ackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [awaitingReady, setAwaitingReady] = useState(false);
  const [loadError, setLoadError] = useState<LoadError | null>(() => {
    if (isBlockedMenuUrl(menuUrl)) {
      return describeLoadError(undefined, menuUrl);
    }
    return null;
  });

  const clearAckTimer = useCallback(() => {
    if (ackTimerRef.current != null) {
      clearTimeout(ackTimerRef.current);
      ackTimerRef.current = null;
    }
  }, []);

  const clearAutoRetry = useCallback(() => {
    if (autoRetryRef.current != null) {
      clearTimeout(autoRetryRef.current);
      autoRetryRef.current = null;
    }
  }, []);

  const markReady = useCallback(() => {
    readyReceivedRef.current = true;
    clearAckTimer();
    setAwaitingReady(false);
    setIsLoading(false);
  }, [clearAckTimer]);

  const startReadyGate = useCallback(() => {
    if (readyReceivedRef.current || loadError) return;
    setAwaitingReady(true);
    setIsLoading(true);
    clearAckTimer();
    ackTimerRef.current = setTimeout(() => {
      if (readyReceivedRef.current) return;
      logger.error("webview.ready_ack_timeout", { url: menuUrl });
      setAwaitingReady(false);
      setIsLoading(false);
      onLoadBlank?.();
    }, READY_ACK_MS);
  }, [clearAckTimer, loadError, menuUrl, onLoadBlank]);

  useEffect(() => {
    failCountRef.current = 0;
    readyReceivedRef.current = false;
    clearAckTimer();
    clearAutoRetry();
    setAwaitingReady(false);
    setLoadError(isBlockedMenuUrl(menuUrl) ? describeLoadError(undefined, menuUrl) : null);
    setIsLoading(true);
    return () => {
      clearAckTimer();
      clearAutoRetry();
    };
  }, [menuUrl, clearAckTimer, clearAutoRetry]);

  useEffect(() => {
    if (!isLoading || loadError || awaitingReady) return;
    const timeoutId = setTimeout(() => {
      logger.error("webview.load_timeout", { url: menuUrl });
      failCountRef.current += 1;
      setLoadError({
        title: "بطء في تحميل المنيو",
        detail:
          "استغرق التحميل وقتاً طويلاً. غالباً EXPO_PUBLIC_MENU_WEB_URL غير قابل للوصول من الجهاز (استخدم HTTPS عام وليس IP محلي).",
      });
      setIsLoading(false);
      if (failCountRef.current >= 2) onFatalLoadError?.();
    }, HARD_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [isLoading, loadError, awaitingReady, menuUrl, onFatalLoadError]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" || isLoading || loadError) return;
      webViewRef.current?.injectJavaScript(KIOSK_SOFT_REFRESH_JS);
    });
    return () => sub.remove();
  }, [isLoading, loadError]);

  const shouldStartLoad = useCallback<NonNullable<WebViewProps["onShouldStartLoadWithRequest"]>>(
    (request) => {
      if (isBlockedMenuUrl(request.url)) {
        logger.warn("webview.blocked_host", { url: request.url });
        setLoadError(describeLoadError(undefined, request.url));
        return false;
      }

      const allowed = isAllowedMenuNavigation(request.url, trustedOrigins);
      if (!allowed) {
        logger.warn("webview.navigation_blocked", {
          url: request.url,
          isTopFrame: request.isTopFrame,
        });
        if (request.isTopFrame) {
          setLoadError({
            title: "تم حظر التحويل",
            detail: "محاولة فتح رابط خارجي — المنيو يعمل داخل التطبيق فقط.",
          });
        }
        return false;
      }
      return true;
    },
    [trustedOrigins],
  );

  const onNavigationStateChange = useCallback(
    (nav: WebViewNavigation) => {
      if (!nav.url || nav.url === "about:blank") return;
      if (isBlockedMenuUrl(nav.url) || !isAllowedMenuNavigation(nav.url, trustedOrigins)) {
        logger.warn("webview.navigation_revert", { url: nav.url });
      }
    },
    [trustedOrigins],
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const raw = event.nativeEvent.data;
      onWebMessage?.(raw);

      try {
        const payload = JSON.parse(raw) as { type?: string };
        if (payload.type === "meez:kiosk-ready") {
          logger.audit("webview.kiosk_ready", { url: menuUrl });
          markReady();
        }
      } catch {
        // ignore non-JSON
      }
    },
    [markReady, menuUrl, onWebMessage],
  );

  const handleRetry = useCallback(() => {
    readyReceivedRef.current = false;
    clearAckTimer();
    clearAutoRetry();
    setLoadError(null);
    setAwaitingReady(false);
    setIsLoading(true);
    webViewRef.current?.reload();
    onRetry?.();
  }, [clearAckTimer, clearAutoRetry, onRetry]);

  useEffect(() => {
    if (!loadError) {
      clearAutoRetry();
      return;
    }
    if (isBlockedMenuUrl(menuUrl)) return;

    autoRetryRef.current = setTimeout(() => {
      logger.audit("webview.load_auto_retry", { url: menuUrl });
      handleRetry();
    }, LOAD_AUTO_RETRY_MS);

    return () => clearAutoRetry();
  }, [loadError, menuUrl, handleRetry, clearAutoRetry]);

  if (loadError) {
    return (
      <View style={styles.errorRoot}>
        <Text style={styles.errorTitle}>{loadError.title}</Text>
        <Text style={styles.errorDetail}>{loadError.detail}</Text>
        <Text style={styles.autoRetryHint}>سيتم إعادة المحاولة تلقائيًا...</Text>
        <Text style={styles.errorUrl} selectable>
          {menuUrl}
        </Text>
        <Pressable style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: menuUrl }}
        style={styles.fill}
        originWhitelist={["http://*", "https://*"]}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        thirdPartyCookiesEnabled={false}
        sharedCookiesEnabled={false}
        overScrollMode="never"
        injectedJavaScriptBeforeContentLoaded={KIOSK_BG_INJECTED_JS}
        injectedJavaScript={KIOSK_GUARD_INJECTED_JS}
        onLoadStart={() => {
          readyReceivedRef.current = false;
          clearAckTimer();
          setAwaitingReady(false);
          setIsLoading(true);
        }}
        onLoadEnd={() => {
          // Do NOT hide loader — wait for SPA handshake
          startReadyGate();
        }}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={shouldStartLoad}
        onNavigationStateChange={onNavigationStateChange}
        onOpenWindow={(event) => {
          logger.warn("webview.open_window_blocked", { url: event.nativeEvent.targetUrl });
        }}
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        allowsBackForwardNavigationGestures={false}
        pullToRefreshEnabled={false}
        cacheEnabled={false}
        domStorageEnabled
        javaScriptEnabled
        onError={(e) => {
          clearAckTimer();
          setAwaitingReady(false);
          setIsLoading(false);
          failCountRef.current += 1;
          logger.error("webview.load_error", {
            code: e.nativeEvent.code,
            description: e.nativeEvent.description,
            url: e.nativeEvent.url ?? menuUrl,
          });
          setLoadError(describeLoadError(undefined, e.nativeEvent.url ?? menuUrl));
          if (failCountRef.current >= 2) onFatalLoadError?.();
        }}
        onHttpError={(e) => {
          const { statusCode, url } = e.nativeEvent;
          logger.error("webview.http_error", { statusCode, url });
          if (statusCode >= 400) {
            clearAckTimer();
            setAwaitingReady(false);
            setIsLoading(false);
            failCountRef.current += 1;
            setLoadError(describeLoadError(statusCode, url));
            if (failCountRef.current >= 2) onFatalLoadError?.();
          }
        }}
        onRenderProcessGone={() => {
          logger.error("webview.process_gone", { url: menuUrl });
          clearAckTimer();
          failCountRef.current += 1;
          setLoadError({
            title: "توقف عرض المنيو",
            detail: "أعاد النظام تحميل الصفحة. اضغط إعادة المحاولة.",
          });
          if (failCountRef.current >= 2) onFatalLoadError?.();
          return true;
        }}
        {...(Platform.OS === "android"
          ? {
              mixedContentMode: "compatibility" as const,
              backgroundColor: APP_BACKGROUND,
            }
          : {})}
      />
      {isLoading && !loadError && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#c4a35a" />
          <Text style={styles.loadingText}>
            {awaitingReady ? "جاري تجهيز المنيو…" : "جاري تحميل المنيو…"}
          </Text>
          <Text style={styles.loadingUrl} numberOfLines={2}>
            {menuUrl}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: APP_BACKGROUND,
  },
  fill: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: APP_BACKGROUND,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: APP_BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: "rgba(248,241,228,0.85)",
    fontSize: 15,
  },
  loadingUrl: {
    color: "rgba(196,163,90,0.85)",
    fontSize: 11,
    fontFamily: "monospace",
    textAlign: "center",
  },
  errorRoot: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: APP_BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    color: "#f8f1e4",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  errorDetail: {
    color: "rgba(248,241,228,0.8)",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 420,
  },
  autoRetryHint: {
    color: "rgba(196,163,90,0.95)",
    fontSize: 12,
    textAlign: "center",
  },
  errorUrl: {
    marginTop: 8,
    color: "rgba(196,163,90,0.9)",
    fontSize: 11,
    fontFamily: "monospace",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#7B4A32",
  },
  retryText: {
    color: "#f8f1e4",
    fontSize: 15,
    fontWeight: "600",
  },
});

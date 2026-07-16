import { useCallback, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import {
  WebView,
  type WebViewNavigation,
  type WebViewProps,
} from "react-native-webview";
import { APP_BACKGROUND } from "@/components/AppShell";
import { logger } from "@/lib/logger";
import { isBlockedMenuUrl } from "@/lib/blocked-menu-hosts";
import { getTrustedMenuOrigins, isAllowedMenuNavigation } from "@/lib/trusted-menu-origin";

const KIOSK_INJECTED_JS = `
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

  var locationProto = window.Location.prototype;
  var origReplace = locationProto.replace;
  var origAssign = locationProto.assign;
  locationProto.replace = function (url) {
    if (isExternal(url)) return;
    return origReplace.call(this, url);
  };
  locationProto.assign = function (url) {
    if (isExternal(url)) return;
    return origAssign.call(this, url);
  };

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
  if (statusCode && statusCode >= 500) {
    return { title: "خطأ في الخادم", detail: `الخادم أعاد ${statusCode}. حاول مرة أخرى.` };
  }
  return {
    title: "تعذّر تحميل المنيو",
    detail: "تحقق من الاتصال بالإنترنت أو إعدادات EXPO_PUBLIC_MENU_WEB_URL.",
  };
}

export function MenuWebView({ menuUrl, onRetry }: Props) {
  const trustedOrigins = useMemo(() => getTrustedMenuOrigins(), []);
  const webViewRef = useRef<WebView>(null);
  const [loadError, setLoadError] = useState<LoadError | null>(() => {
    if (isBlockedMenuUrl(menuUrl)) {
      return describeLoadError(undefined, menuUrl);
    }
    return null;
  });

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

  const handleRetry = useCallback(() => {
    setLoadError(null);
    webViewRef.current?.reload();
    onRetry?.();
  }, [onRetry]);

  if (loadError) {
    return (
      <View style={styles.errorRoot}>
        <Text style={styles.errorTitle}>{loadError.title}</Text>
        <Text style={styles.errorDetail}>{loadError.detail}</Text>
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
    <WebView
      ref={webViewRef}
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
      setDisplayZoomControls={false}
      allowsBackForwardNavigationGestures={false}
      pullToRefreshEnabled={false}
      cacheEnabled
      domStorageEnabled
      javaScriptEnabled
      onError={(e) => {
        logger.error("webview.load_error", {
          code: e.nativeEvent.code,
          description: e.nativeEvent.description,
          url: e.nativeEvent.url ?? menuUrl,
        });
        setLoadError(describeLoadError(undefined, e.nativeEvent.url ?? menuUrl));
      }}
      onHttpError={(e) => {
        const { statusCode, url } = e.nativeEvent;
        logger.error("webview.http_error", { statusCode, url });
        if (statusCode >= 400) {
          setLoadError(describeLoadError(statusCode, url));
        }
      }}
      onRenderProcessGone={() => {
        logger.error("webview.process_gone", { url: menuUrl });
        setLoadError({
          title: "توقف عرض المنيو",
          detail: "أعاد النظام تحميل الصفحة. اضغط إعادة المحاولة.",
        });
        return true;
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

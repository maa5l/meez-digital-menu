import { useEffect } from "react";

const MAIN_MANIFEST = "/site.webmanifest";
const PAIR_MANIFEST = "/pair.webmanifest";
const PAIR_TITLE = "تفعيل ميز";

function ensureMeta(name: string, content: string): () => void {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  const created = !el;
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  const previous = el.content;
  el.content = content;
  return () => {
    if (!el) return;
    if (created) {
      el.remove();
      return;
    }
    el.content = previous;
  };
}

/**
 * While /pair is mounted, point the web app manifest at pair.webmanifest so iOS
 * "Add to Home Screen" launches /pair instead of the marketing start_url (/).
 * Restores the main site manifest on unmount.
 */
export function usePairHomeScreenMeta(): void {
  useEffect(() => {
    const manifest =
      (document.getElementById("app-manifest") as HTMLLinkElement | null) ??
      (document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null);

    const previousManifestHref = manifest?.getAttribute("href") ?? MAIN_MANIFEST;
    if (manifest) {
      manifest.setAttribute("href", PAIR_MANIFEST);
    }

    const previousDocumentTitle = document.title;
    document.title = PAIR_TITLE;

    const restoreCapable = ensureMeta("apple-mobile-web-app-capable", "yes");
    const restoreMobileCapable = ensureMeta("mobile-web-app-capable", "yes");
    const restoreStatus = ensureMeta(
      "apple-mobile-web-app-status-bar-style",
      "black-translucent",
    );
    const restoreTitle = ensureMeta("apple-mobile-web-app-title", PAIR_TITLE);

    return () => {
      if (manifest) {
        manifest.setAttribute("href", previousManifestHref);
      }
      document.title = previousDocumentTitle;
      restoreCapable();
      restoreMobileCapable();
      restoreStatus();
      restoreTitle();
    };
  }, []);
}

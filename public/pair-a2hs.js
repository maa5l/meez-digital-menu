/**
 * Runs before the SPA bootstraps. When the URL is /pair, point the linked
 * webmanifest at pair.webmanifest so iOS Safari "Add to Home Screen" records
 * start_url=/pair instead of the marketing site's "/".
 */
(function () {
  try {
    var path = location.pathname || "/";
    if (path !== "/pair" && path.indexOf("/pair/") !== 0) return;

    var manifest = document.getElementById("app-manifest");
    if (manifest) {
      manifest.setAttribute("href", "/pair.webmanifest");
    }

    document.title = "تفعيل ميز";

    function setMeta(name, content) {
      var el = document.querySelector('meta[name="' + name + '"]');
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    }

    setMeta("apple-mobile-web-app-capable", "yes");
    setMeta("mobile-web-app-capable", "yes");
    setMeta("apple-mobile-web-app-title", "تفعيل ميز");
  } catch (_) {
    /* ignore — pair page still works without A2HS tweak */
  }
})();

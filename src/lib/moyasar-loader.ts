const MOYASAR_SCRIPT = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.js";

let loadPromise: Promise<void> | null = null;

export function loadMoyasarScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("browser_only"));
  }
  if (window.Moyasar) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${MOYASAR_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("moyasar_script_failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = MOYASAR_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("moyasar_script_failed"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

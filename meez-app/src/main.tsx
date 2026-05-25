import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import App from "./App";
import "./index.css";

async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await SplashScreen.hide();
  } catch {
    /* optional on simulator */
  }

  CapApp.addListener("appUrlOpen", (event) => {
    if (event.url) {
      try {
        const parsed = new URL(event.url);
        const code = parsed.searchParams.get("code");
        if (code) {
          window.location.search = `?code=${encodeURIComponent(code)}`;
        }
      } catch {
        /* ignore */
      }
    }
  });
}

void initNativeShell().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

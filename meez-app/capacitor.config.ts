import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.meez.kiosk",
  appName: "ميز",
  webDir: "dist",
  ios: {
    contentInset: "always",
    preferredContentMode: "mobile",
    scheme: "Meez",
  },
  server: {
    androidScheme: "https",
  },
};

export default config;

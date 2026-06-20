import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { publicFontsPlugin } from "./src/plugins/public-fonts";

export default defineConfig({
  plugins: [react(), publicFontsPlugin()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    host: "::",
    port: 8081,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});

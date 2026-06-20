import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const rootFontsDir = path.resolve(__dirname, "../../../public/fonts");

function fontPathFromUrl(url: string): string | null {
  const basename = path.basename(decodeURIComponent(url.split("?")[0] ?? ""));
  if (!basename.endsWith(".ttf")) return null;
  const file = path.resolve(rootFontsDir, basename);
  if (!file.startsWith(rootFontsDir)) return null;
  return fs.existsSync(file) ? file : null;
}

/** Serves font files from the repo root `public/fonts` in dev and copies them into `dist/fonts` on build. */
export function publicFontsPlugin(): Plugin {
  return {
    name: "public-fonts",
    configureServer(server) {
      server.middlewares.use("/fonts", (req, res, next) => {
        if (!req.url) return next();
        const file = fontPathFromUrl(req.url);
        if (!file) return next();
        res.setHeader("Content-Type", "font/ttf");
        fs.createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      const outDir = path.resolve(__dirname, "../../dist/fonts");
      fs.mkdirSync(outDir, { recursive: true });
      for (const name of fs.readdirSync(rootFontsDir)) {
        if (!name.endsWith(".ttf")) continue;
        fs.copyFileSync(path.join(rootFontsDir, name), path.join(outDir, name));
      }
    },
  };
}

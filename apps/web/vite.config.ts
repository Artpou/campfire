import { lingui } from "@lingui/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import viteTsConfigPaths from "vite-tsconfig-paths";

import rootPackageJson from "../../package.json";

const isKnip = process.env.KNIP === "true" || process.env.KNIP === "1";

const apiTarget = process.env.VITE_API_URL || "http://localhost:3002";

const config = defineConfig({
  envDir: "../../",
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(rootPackageJson.version),
  },
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true,
      routeFileIgnorePattern: "\\.(test|spec|helper)\\.[jt]sx?$|/helpers/",
    }),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    viteReact({
      plugins: [["@lingui/swc-plugin", {}]],
    }),
    isKnip ? lingui() : undefined,
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "logo.svg", "logo.png", "logo192.png", "logo512.png"],
      manifest: {
        name: "Seedarr",
        short_name: "Seedarr",
        description: "Self-hosted media manager — browse, download, and stream.",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        icons: [
          { src: "/logo192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/logo512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/logo512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/, /^\/streaming/, /^\/avatars/, /^\/downloads\/file/],
      },
    }),
  ],
  // Proxy streaming so movi-player (credentials: same-origin) can send the session cookie in dev.
  server: {
    proxy: {
      "/streaming": {
        target: apiTarget,
        changeOrigin: true,
      },
      "/avatars": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    // App shell stays under this; movi-player is loaded via dynamic import().
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Naming only — Vite already splits dynamic imports; a stable name helps ops/cache.
        manualChunks(id) {
          if (id.includes("node_modules/movi-player") || id.includes("node_modules/.pnpm/movi-player@")) {
            return "movi-player";
          }
        },
      },
    },
  },
});

export default config;

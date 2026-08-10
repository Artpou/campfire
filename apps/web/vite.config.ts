import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { lingui } from "@lingui/vite-plugin";

const isKnip = process.env.KNIP === "true" || process.env.KNIP === "1";

const apiTarget = process.env.VITE_API_URL || "http://localhost:3002";

const config = defineConfig({
  envDir: "../../",
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

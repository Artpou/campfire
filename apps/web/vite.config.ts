import tailwindcss from "@tailwindcss/vite";
import { nitroV2Plugin } from "@tanstack/nitro-v2-vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
  // Load .env from monorepo root (2 levels up)
  envDir: "../../",
  // Note: Deprecation warning about optimizeDeps.rollupOptions comes from
  // TanStack plugins (nitro-v2-vite-plugin or react-start) which haven't
  // been updated to use rolldownOptions yet. This is harmless and will be
  // fixed when the plugins are updated.
  plugins: [
    nitroV2Plugin(),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;

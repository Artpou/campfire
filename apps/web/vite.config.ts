import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { lingui } from "@lingui/vite-plugin";

const isKnip = process.env.KNIP === "true" || process.env.KNIP === "1";

const config = defineConfig({
  envDir: "../../",
  plugins: [
    tanstackRouter({ autoCodeSplitting: true }),
    // TS7 has no programmatic ts.sys API — vite-plugin-checker is unsupported; use `pnpm tsc`
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    viteReact({
      plugins: [["@lingui/swc-plugin", {}]],
    }),
    isKnip ? lingui() : undefined,
  ],
});

export default config;
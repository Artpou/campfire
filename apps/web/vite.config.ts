import tailwindcss from "@tailwindcss/vite";
import { nitroV2Plugin } from "@tanstack/nitro-v2-vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { lingui } from "@lingui/vite-plugin";

const config = defineConfig({
  envDir: "../../",
  plugins: [
    nitroV2Plugin(),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact({
      plugins: [["@lingui/swc-plugin", {}]],
    }),
    lingui(),
  ],
});

export default config;
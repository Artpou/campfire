import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import checker from "vite-plugin-checker";
import viteReact from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { lingui } from "@lingui/vite-plugin";

const isKnip = process.env.KNIP === "true" || process.env.KNIP === "1";

const config = defineConfig({
  envDir: "../../",
  plugins: [
    tanstackRouter(),
    checker({ 
      typescript: { tsconfigPath: "./tsconfig.json", buildMode: true },
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
});

export default config;
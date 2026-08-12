import path from "node:path";

import viteReact from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";
import viteTsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    viteReact({
      plugins: [["@lingui/swc-plugin", {}]],
    }),
  ],
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        "src/**/helpers/**/*.ts",
        "src/**/stores/**/*.ts",
        "src/routes/helpers/**/*.ts",
        "src/lib/**/*.ts",
      ],
      exclude: ["src/**/*.test.ts", "src/**/test*", "src/**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

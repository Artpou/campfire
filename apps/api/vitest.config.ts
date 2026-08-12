import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: ".",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/test*",
        "src/**/*.d.ts",
        "src/server.ts",
        "src/db/drizzle/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

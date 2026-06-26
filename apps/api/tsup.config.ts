import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist-server",
  clean: true,
  sourcemap: true,
  splitting: false,
  bundle: true,
  noExternal: [/^@seedarr\//],
  esbuildOptions(options) {
    options.alias = {
      "@": "./src",
    }
  },
})

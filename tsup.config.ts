import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/bin/patchwise.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  dts: false,
  splitting: false,
  minify: false,
  shims: false,
});

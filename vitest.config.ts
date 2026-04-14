import { configDefaults, defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        ...configDefaults.exclude,
        "dist/**",
        "test/**",
        "tsup.config.ts",
        "vitest.config.ts",
        "eslint.config.ts",
      ],
    },
  },
});

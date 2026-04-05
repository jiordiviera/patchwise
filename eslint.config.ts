import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

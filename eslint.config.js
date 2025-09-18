import eslint from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import globals from "globals";
import tseslint from "typescript-eslint";

const { extends: _nextExtends, plugins: _nextPlugins, ...nextCoreWebVitalsRest } =
  nextPlugin.configs["core-web-vitals"];

const nextCoreWebVitals = {
  ...nextCoreWebVitalsRest,
  plugins: {
    "@next/next": nextPlugin,
  },
};

export default tseslint.config(
  {
    ignores: ["dist", "node_modules", ".next"],
  },
  {
    plugins: {
      "@next/next": nextPlugin,
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.scripts.json"],
        tsconfigRootDir: process.cwd(),
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    ...nextCoreWebVitals,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
  },
  {
    files: ["scripts/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}", "codex/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
  },
  {
    files: ["next-env.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
);

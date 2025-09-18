import { defineConfig } from "vitest/config";
import tsconfigScripts from "./tsconfig.scripts.json" with { type: "json" };

const tsconfigRaw = tsconfigScripts as Record<string, unknown>;

export default defineConfig({
  test: {
    environment: "node",
  },
  esbuild: {
    tsconfigRaw,
  },
});

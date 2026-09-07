import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: ".cache",
  resolve: {
    alias: {
      "@": `${import.meta.dirname}/src`,
    },
  },
  test: {
    environment: "node",
    coverage: {
      reportsDirectory: ".cache/coverage",
    },
  },
});

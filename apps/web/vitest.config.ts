import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  oxc: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@learning-os/ui": resolve(__dirname, "../../packages/ui/src"),
      "@learning-os/shared": resolve(__dirname, "../../packages/shared/src"),
    },
  },
});

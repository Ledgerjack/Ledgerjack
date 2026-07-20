import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // happy-dom gives us window/navigator/crypto for the browser-facing helpers.
    environment: "happy-dom",
    include: ["tests/**/*.test.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts"],
    },
  },
});

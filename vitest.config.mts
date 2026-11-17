import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      // Vitest runs in plain Node, where the real "server-only" package would throw on import.
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
  },
});

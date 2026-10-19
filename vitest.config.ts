import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "server-only": `${root}tests/helpers/server-only.ts`,
      "@": root,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/helpers/env.ts"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // Os testes de integração e e2e partilham uma base de dados local; correm
    // em série para não se pisarem.
    fileParallelism: false,
  },
});

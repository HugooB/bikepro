import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Database tests get a fresh in-memory SQLite database per test file.
    env: { DATABASE_PATH: ":memory:" },
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.ts", "src/components/ui/**"],
      reporter: ["text-summary", "html"],
    },
  },
});

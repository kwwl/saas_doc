/**
 * Vitest configuration for the Next.js frontend.
 *
 * Uses jsdom so DOM APIs (localStorage, window.location, document) work in
 * unit tests, and the React plugin so .tsx files are transformed. The `@/`
 * alias mirrors tsconfig.json so test imports look identical to app imports.
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});

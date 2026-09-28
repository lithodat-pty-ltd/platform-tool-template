import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      axios: fileURLToPath(new URL("./src/platform/axiosDevStub.ts", import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ["mapbox-gl"],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

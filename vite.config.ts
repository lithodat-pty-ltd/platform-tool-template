import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** Same host as `EARTHBANK_ORIGIN` in `src/platform/api.ts`. Dev-server only. */
const EARTHBANK_DEV_PROXY = "https://testapp.ausgeochem.org";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // The sandbox calls this dev server. Forward `/api` to EarthBank so the
      // browser stays on one origin and does not need a CORS header from testapp.
      // The published module does not use this proxy.
      "/api": {
        target: EARTHBANK_DEV_PROXY,
        changeOrigin: true,
        secure: true,
      },
    },
  },
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

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import https from "node:https";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_API_BASE_URL || "https://willfully-external-disinfect.ngrok-free.dev";
  const apiProxyAgent = new https.Agent({
    keepAlive: true,
    rejectUnauthorized: false,
  });

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rolldownOptions: {
        checks: { pluginTimings: false },
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
          agent: apiProxyAgent,
          timeout: 60000,
          proxyTimeout: 60000,
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        },
      },
    },
  };
});

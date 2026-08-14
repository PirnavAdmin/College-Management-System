import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_API_BASE_URL || "https://sterile-retorted-tightness.ngrok-free.dev";


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
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
          configure: (proxy) => {
            proxy.on("error", (error, _request, response) => {
              if (!response || response.headersSent) return;

              response.writeHead(502, { "Content-Type": "application/json" });
              response.end(JSON.stringify({
                message: "The API server is unavailable. Check VITE_API_BASE_URL and confirm the backend/ngrok tunnel is running.",
                detail: error.code || error.message,
              }));
            });
          },
        },
      },
    },
  };
});




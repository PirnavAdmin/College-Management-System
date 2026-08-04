import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      "/api-proxy": {
        target: "https://chance-sulfide-blaming.ngrok-free.dev",
        changeOrigin: true,
        // ngrok development tunnels can use certificates that Node does not
        // recognize locally. This applies only to the Vite development proxy.
        secure: false,
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
        rewrite: (path) => path.replace(/^\/api-proxy/, ""),
      },
    },
  },
});

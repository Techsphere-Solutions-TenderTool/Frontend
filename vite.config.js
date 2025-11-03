// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy /polly requests to the real Polly endpoint in development
      // This avoids CORS issues during local development
      "/polly": {
        target: process.env.VITE_POLLY_API_URL || "https://rd7d38w2h5.execute-api.af-south-1.amazonaws.com/default/tenderToolPolly",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/polly/, ""),
        secure: true,
        ws: false,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("Polly proxy error:", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log(`[Polly] ${req.method} ${req.url}`);
          });
        },
      },
    },
  },
});
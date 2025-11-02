// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/polly": {
        target: "https://rd7d38w2h5.execute-api.af-south-1.amazonaws.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/polly/, "/default/tenderToolPolly"),
      },
    },
  },
});

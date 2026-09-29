// DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// /api/* is proxied to the FastAPI backend (uvicorn src.api:app --port 8000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        // Override to proxy a remote backend in dev, e.g. API_PROXY_TARGET=https://<api>.up.railway.app
        target: process.env.API_PROXY_TARGET || "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});

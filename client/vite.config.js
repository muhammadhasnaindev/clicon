

// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.VITE_BACKEND_ORIGIN || "http://localhost:4000";

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Single /api key (no duplicates)
        "/api": { target: backend, changeOrigin: true, secure: false },
        // Let dev server forward uploaded files to backend
        "/uploads": { target: backend, changeOrigin: true, secure: false },
      },
    },
  };
});

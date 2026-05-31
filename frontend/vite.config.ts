import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // все запросы /token, /users/*, /lessons/*, etc. → бэкенд
      "/token":       { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/users":       { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/auth":        { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/lessons":     { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/homework":    { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/answers":     { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/payments":    { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/chat":        { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/forum":       { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/invitations": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/yoomoney":    { target: "http://127.0.0.1:8000", changeOrigin: true },
    },
  },
});

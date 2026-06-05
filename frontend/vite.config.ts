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
      "/token":         { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/auth":          { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/users":         { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/lessons":       { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/homework":      { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/answers":       { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/payments":      { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/chat":          { target: "http://127.0.0.1:8000", changeOrigin: true, ws: true },
      "/forum":         { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/invitations":   { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/yoomoney":      { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/upload":        { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/calendar":      { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/reports":       { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/notifications": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/admin":         { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/slots":         { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/progress":      { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/health":        { target: "http://127.0.0.1:8000", changeOrigin: true },
    },
  },
});

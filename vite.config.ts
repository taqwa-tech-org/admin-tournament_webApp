import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// In development the panel proxies /api to the Express server, so the session cookie is
// first-party and no CORS setup is needed. In production, either serve the panel and the API
// behind the same domain (recommended: admin.example.com with /api proxied to the API) or set VITE_API_URL.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL(".", import.meta.url)), "");
  const target = env.API_PROXY_TARGET || "http://localhost:4000";
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: { port: 5174, strictPort: true, proxy: { "/api": { target, changeOrigin: false } } },
    preview: { port: 5174, strictPort: true, proxy: { "/api": { target, changeOrigin: false } } },
    build: { outDir: "dist", sourcemap: false, chunkSizeWarningLimit: 700 },
  };
});

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8080";

  return {
    plugins: [
      tailwindcss(),
      tanstackRouter({
        routesDirectory: "./src/routes",
        generatedRouteTree: "./src/routeTree.gen.ts",
        autoCodeSplitting: true,
      }),
      react(),
    ],
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    server: {
      host: "0.0.0.0",
      port: 5174,
      proxy: {
        "^/api(?:/|$)": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    build: { target: "esnext" },
  };
});

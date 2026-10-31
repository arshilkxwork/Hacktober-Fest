import { fileURLToPath, URL } from "node:url";
import type { ServerResponse } from "node:http";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backend = process.env.DECISIONTRAIL_API ?? "http://127.0.0.1:8765";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: backend,
        changeOrigin: true,
        // Answer with a recognisable 503 so the client can tell "backend not running"
        // apart from a real server error.
        configure(proxy) {
          proxy.on("error", (_err, _req, res) => {
            const out = res as ServerResponse;
            if (!out || !("writeHead" in out) || out.headersSent) return;
            out.writeHead(503, { "Content-Type": "application/json", "X-DecisionTrail-Offline": "1" });
            out.end(JSON.stringify({ error: `Backend unreachable at ${backend}` }));
          });
        },
      },
    },
  },
  preview: {
    port: 4173,
    proxy: { "/api": { target: backend, changeOrigin: true } },
  },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

function remoteLogPlugin() {
  return {
    name: 'remote-log',
    configureServer(server: { ws: { on: (event: string, handler: (data: unknown) => void) => void } }) {
      server.ws.on('app:log', (data: unknown) => {
        const { level = 'log', args = [] } = data as { level?: string; args?: unknown[] };
        // eslint-disable-next-line no-console
        console.log(`[app:${level}]`, ...(args as string[]));
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), remoteLogPlugin()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. exclude Node.js-only modules from browser bundle
  build: {
    rollupOptions: {
      external: [
        './src/ai/optimization/artifacts',
        './src/ai/optimization/datasets',
        './src/ai/optimization/optimizer'
      ]
    }
  },
  // 3. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));

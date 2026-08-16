import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Renderer build config. Electron main process is compiled separately via tsc (see tsconfig.main.json).
// Two HTML entry points: the main app window and the frameless capture-selection overlay window.
export default defineConfig({
  root: "src/renderer",
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@renderer": path.resolve(__dirname, "src/renderer"),
      "@shared": path.resolve(__dirname, "src/shared")
    }
  },
  build: {
    outDir: path.resolve(__dirname, "dist/renderer"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "src/renderer/index.html"),
        overlay: path.resolve(__dirname, "src/renderer/overlay/overlay.html"),
        quickpanel: path.resolve(__dirname, "src/renderer/quickpanel/quickpanel.html")
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});

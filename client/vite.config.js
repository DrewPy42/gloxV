import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  root: '.', // Ensure the root is set to the directory containing `index.html`
  build: {
    outDir: 'dist', // Output directory for built files
    emptyOutDir: true,
  },
  server: {
    host: true, // Allow to access the server from external devices
  },
});
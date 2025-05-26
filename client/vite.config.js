import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

/**
 * @type {import('vite').UserConfigExport}
 * The configuration object for Vite, typed using Vite's UserConfigExport.
 */
export default defineConfig({
  /**
   * @type {import('vite').Plugin[]}
   * Array of Vite plugins. Here, only the Vue plugin is used.
   */
  plugins: [vue()],
  /**
   * @type {string}
   * The root directory for the project. Set to the current directory.
   */
  root: '.', // Ensure the root is set to the directory containing `index.html`
  build: {
    /**
     * @type {string}
     * Output directory for built files.
     */
    outDir: 'dist',
    /**
     * @type {boolean}
     * Whether to empty the output directory before building.
     */
    emptyOutDir: true,
  },
  server: {
    /**
     * @type {boolean}
     * Allow to access the server from external devices.
     */
    host: true,
    /**
     * @type {Object.<string, import('vite').ProxyOptions>}
     * Proxy configuration for the dev server.
     */
    proxy: {
      '/api': {
        /**
         * @type {string}
         * Target URL for the proxy.
         */
        target: 'http://localhost:3000/api',
        /**
         * @type {boolean}
         * Whether to change the origin of the host header to the target URL.
         */
        changeOrigin: true
      }
    }
  },
  resolve: {
    /**
     * @type {Record<string, string>}
     * Aliases for module resolution.
     */
    alias: {
      /**
       * @type {string}
       * Alias '@' points to the 'src' directory.
       */
      '@': path.resolve(__dirname, 'src'), // Ensure this line exists
    },
  },
});
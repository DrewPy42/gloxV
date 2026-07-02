import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// Shared with docker-compose and the server — see the root .env file.
const rootDir = path.resolve(__dirname, '..');

/**
 * @type {import('vite').UserConfigExport}
 * The configuration object for Vite, typed using Vite's UserConfigExport.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');

  return {
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
    // Read the .env file from the repo root instead of client/, so it's shared
    // with docker-compose and the server.
    envDir: rootDir,
    // Expose SERVER_* vars (in addition to the default VITE_* vars) to client code
    // via import.meta.env, scoped so unrelated secrets (e.g. MYSQL_*) stay out of the bundle.
    envPrefix: ['VITE_', 'SERVER_'],
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
          target: `${env.SERVER_URL}:${env.SERVER_PORT}`,
          /**
           * @type {boolean}
           * Whether to change the origin of the host header to the target URL.
           */
          changeOrigin: true
        }
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['import', 'global-builtin'],
        },
      },
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
  };
});
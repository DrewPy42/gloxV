import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import vuetify from './plugins/vuetify';
import { library, config } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';

// Configure Font Awesome
config.autoAddCss = false; // We'll handle the CSS ourselves

// Add Font Awesome icons to the library
library.add(fas, far);

// Add Font Awesome CSS
import '@fortawesome/fontawesome-svg-core/styles.css';

// Polyfill for structuredClone in browser and Node.js environments
function structured_clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

if (typeof window !== 'undefined' && typeof window.structuredClone === 'undefined') {
  (window as any).structuredClone = structured_clone;
} else if (typeof globalThis !== 'undefined' && typeof (globalThis as any).structuredClone === 'undefined') {
  (globalThis as any).structuredClone = structured_clone;
}

// Import global styles
import '@/styles/main.scss';

// Create and mount the app
const app = createApp(App);

// Register global components
app.component('font-awesome-icon', FontAwesomeIcon);

// Use plugins
app.use(createPinia());
app.use(router);
app.use(vuetify);

// Mount the app
app.mount('#app');
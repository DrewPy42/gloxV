import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index';


// Polyfill for structuredClone in browser and Node.js environments.
function structured_clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

if (typeof window !== 'undefined' && typeof window.structuredClone === 'undefined') {
  (window as any).structuredClone = structured_clone;
} else if (typeof globalThis !== 'undefined' && typeof (globalThis as any).structuredClone === 'undefined') {
  (globalThis as any).structuredClone = structured_clone;
}

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library, config } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';

library.add(fas);
library.add(far);
config.styleDefault = 'solid';

createApp(App)
  .component('font-awesome-icon', FontAwesomeIcon)
  .use(createPinia())
  .use(router)
  .mount('#app');
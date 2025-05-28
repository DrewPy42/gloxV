// Reasoning: 'createApp' is a function imported from 'vue', used to create a Vue application instance.
/** @type {import('vue').CreateAppFunction} */
import { createApp } from 'vue'

// Reasoning: 'createPinia' is a function from 'pinia', used to create a Pinia store instance.
/** @type {() => import('pinia').Pinia} */
import { createPinia } from 'pinia'

// Reasoning: 'App' is a Vue component, imported as the root component.
/** @type {import('vue').Component} */
import App from './App.vue'

// Reasoning: 'router' is a Vue Router instance.
/** @type {import('vue-router').Router} */
import router from './router/index.js'

// Reasoning: 'structured_clone' is a function for deep cloning, imported from 'structured-clone' package.
/** @type {(value: any) => any} */
import structured_clone from 'structured-clone'

// Polyfill for structuredClone in browser and Node.js environments.
if (typeof global === 'undefined' && typeof window !== 'undefined') {
  window.structuredClone = structured_clone;
} else if (typeof global !== 'undefined') {
  global.structuredClone = structured_clone;
}

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

// Reasoning: 'FontAwesomeIcon' is a Vue component for FontAwesome icons.
/** @type {import('vue').Component} */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

// Reasoning: 'library' is the FontAwesome icon library, 'config' is the configuration object.
/** @type {import('@fortawesome/fontawesome-svg-core').Library} */
import { library, config } from '@fortawesome/fontawesome-svg-core'

// Reasoning: 'fas' and 'far' are icon packs for solid and regular icons.
/** @type {import('@fortawesome/fontawesome-svg-core').IconPack} */
import { fas } from '@fortawesome/free-solid-svg-icons'
/** @type {import('@fortawesome/fontawesome-svg-core').IconPack} */
import { far } from '@fortawesome/free-regular-svg-icons'

library.add(fas)
library.add(far)
config.styleDefault = 'solid'

// Reasoning: The main Vue app is created, FontAwesomeIcon is registered, Pinia and router are used, and the app is mounted to '#app'.
createApp(App)
  .component('font-awesome-icon', FontAwesomeIcon)
  .use(createPinia())
  .use(router)
  .mount('#app')
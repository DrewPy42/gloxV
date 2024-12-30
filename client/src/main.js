import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router/index.js'

// we need structured-clone for it to work in a web browser for some reason
import structured_clone from 'structured-clone'
if (typeof global === 'undefined' && typeof window !== 'undefined') {
  window.structuredClone = structured_clone;
} else if (typeof global !== 'undefined') {
  global.structuredClone = structured_clone;
}


import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
/* import font awesome icon component */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library, config } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'

library.add(fas)
library.add(far)
config.styleDefault = 'solid'


createApp(App)
  .component('font-awesome-icon', FontAwesomeIcon)
  .use(createPinia())
  .use(router)
  .mount('#app')


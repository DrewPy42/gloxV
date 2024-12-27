import { createApp } from 'vue'
// import './style.css'
import App from './App.vue'

import structured_clone from 'structured-clone'

if (typeof global === 'undefined' && typeof window !== 'undefined') {
  window.structuredClone = structured_clone;
} else if (typeof global !== 'undefined') {
  global.structuredClone = structured_clone;
}

createApp(App).mount(
  '#app'
)


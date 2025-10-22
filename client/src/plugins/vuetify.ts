import 'vuetify/styles'
import { createVuetify, type VuetifyOptions } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const vuetifyOptions: VuetifyOptions = {
  components,
  directives,
  theme: {
    defaultTheme: 'light'
  }
}

export default createVuetify(vuetifyOptions)

export type Vuetify = ReturnType<typeof createVuetify>
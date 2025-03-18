import { createRouter, createWebHistory } from 'vue-router'
import homePage from '@/components/pages/homePage.vue'
import seriesDashboard from '@/components/dashboards/series/seriesDashboard.vue'
import statsForm from '@/components/forms/statsForm.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: homePage,
    },
    {
      path: '/series',
      name: 'series',
      component: seriesDashboard,
    },
    {
      path: '/stats',
      name: 'stats',
      component: statsForm,
    }
  ]
})

export default router

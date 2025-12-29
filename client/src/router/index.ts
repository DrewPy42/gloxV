import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/components/pages/HomePage.vue')
  },
  {
    path: '/series',
    name: 'series',
    component: () => import('@/components/pages/SeriesPage.vue')
  },
  {
    path: '/storylines',
    name: 'storylines',
    component: () => import('@/components/pages/StorylinePage.vue')
  },
  {
    path: '/locations',
    name: 'locations',
    component: () => import('@/components/pages/LocationPage.vue')
  },
  {
    path: '/publishers',
    name: 'publishers',
    component: () => import('@/components/pages/PublisherPage.vue')
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('@/components/pages/StatsPage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router

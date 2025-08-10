import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import admin_routes from './adminRouter'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/om-automatisering',
      name: 'Om automatisering',
      component: () => import('../views/AutomatiseringView.vue'),
    },
    {
      path: '/om-dataanalyse',
      name: 'Om dataanalyse',
      component: () => import('../views/DataanalyseView.vue'),
    },
    {
      path: '/om-integrasjon',
      name: 'Om integrasjon',
      component: () => import('../views/IntegrasjonView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/dashboard/MainDashboard.vue'),
    },
  ],
})

export default router

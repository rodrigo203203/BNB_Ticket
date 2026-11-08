import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { Role } from '@bnb/shared';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/solicitudes',
    name: 'Solicitudes',
    component: () => import('../views/SolicitudesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/solicitudes/nueva',
    name: 'NuevaSolicitud',
    component: () => import('../views/NuevaSolicitudView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/solicitudes/:id',
    name: 'SolicitudDetalle',
    component: () => import('../views/SolicitudDetailView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/kanban',
    name: 'Kanban',
    component: () => import('../views/KanbanView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin/users',
    name: 'UsersAdmin',
    component: () => import('../views/UsersAdminView.vue'),
    meta: { requiresAuth: true, roles: [Role.ADMINISTRADOR] },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/ProfileView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/sessions',
    name: 'Sessions',
    component: () => import('../views/SessionsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/unauthorized',
    name: 'Unauthorized',
    component: () => import('../views/UnauthorizedView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue'),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  if (!authStore.initialized) {
    await authStore.fetchMe();
  }

  const isAuthenticated = authStore.isAuthenticated;

  if (to.meta.guestOnly && isAuthenticated) {
    return next('/dashboard');
  }

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ path: '/login', query: { redirect: to.fullPath } });
  }

  const requiredRoles = to.meta.roles as Role[] | undefined;
  if (requiredRoles && !authStore.hasRole(requiredRoles)) {
    return next('/unauthorized');
  }

  next();
});

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { ROLE_LABELS, Role } from '@bnb/shared';
import UserAvatarImage from '../components/UserAvatarImage.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const mobileMenuOpen = ref(false);

const navItems = computed(() => {
  const items = [
    { label: 'Dashboard', path: '/dashboard', icon: 'chart-pie' },
    { label: 'Solicitudes', path: '/solicitudes', icon: 'ticket' },
    { label: 'Nueva Solicitud', path: '/solicitudes/nueva', icon: 'plus' },
    { label: 'Tablero Kanban', path: '/kanban', icon: 'table-columns' },
  ];

  if (authStore.user?.role === Role.ADMINISTRADOR) {
    items.push({ label: 'Gestión Usuarios', path: '/admin/users', icon: 'users' });
  }

  items.push(
    { label: 'Mi Perfil', path: '/profile', icon: 'user' },
    { label: 'Mis Sesiones', path: '/sessions', icon: 'shield-halved' },
  );

  return items;
});

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="app-container">
    <!-- Barra Superior -->
    <header class="app-header">
      <div class="header-left">
        <button class="mobile-toggle" @click="mobileMenuOpen = !mobileMenuOpen" aria-label="Menu">
          <font-awesome-icon icon="bars" />
        </button>
        <div class="brand">
          <div class="brand-badge">BNB</div>
          <span class="brand-title">Gerencia de Datos</span>
          <span class="brand-subtitle">Gestión de Solicitudes</span>
        </div>
      </div>

      <div class="header-right">
        <router-link
          to="/profile"
          class="user-pill"
          v-if="authStore.user"
          title="Ver mi perfil"
        >
          <UserAvatarImage :user="authStore.user" size="sm" />
          <div class="user-info">
            <span class="user-name">{{ authStore.user.fullName }}</span>
            <span class="user-role">{{ ROLE_LABELS[authStore.user.role] }}</span>
          </div>
        </router-link>
        <button class="logout-btn" @click="handleLogout" title="Cerrar Sesión">
          <font-awesome-icon icon="right-from-bracket" />
          <span class="btn-text">Salir</span>
        </button>
      </div>
    </header>

    <div class="app-body">
      <!-- Barra Lateral / Sidebar -->
      <aside :class="['app-sidebar', { 'mobile-open': mobileMenuOpen }]">
        <div class="sidebar-role-indicator">
          <small>Rol Activo</small>
          <strong>{{ authStore.user ? ROLE_LABELS[authStore.user.role] : 'Cargando...' }}</strong>
          <span class="area-tag">{{ authStore.user?.area }}</span>
        </div>

        <nav class="sidebar-nav">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="nav-link"
            :class="{ active: route.path === item.path }"
            @click="mobileMenuOpen = false"
          >
            <font-awesome-icon :icon="item.icon" class="nav-icon" />
            <span>{{ item.label }}</span>
          </router-link>
        </nav>

        <div class="sidebar-footer">
          <small>Plataforma BNB v1.0 (Fase 1)</small>
        </div>
      </aside>

      <!-- Contenido Principal -->
      <main class="app-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
}

.app-header {
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 40;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.mobile-toggle {
  display: none;
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #475569;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.brand-badge {
  background: var(--bnb-green);
  color: #ffffff;
  font-weight: 800;
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  letter-spacing: 0.05em;
}

.brand-title {
  font-weight: 700;
  color: var(--bnb-purple);
  font-size: 1.1rem;
}

.brand-subtitle {
  color: #64748b;
  font-size: 0.9rem;
  display: inline-block;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.35rem 0.75rem;
  background: #f8fafc;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
  max-width: 220px;
  min-width: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.user-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-role {
  font-size: 0.72rem;
  color: var(--bnb-green);
  font-weight: 600;
}

.logout-btn {
  background: transparent;
  border: 1px solid #e2e8f0;
  padding: 0.45rem 0.85rem;
  border-radius: 6px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
}

.app-body {
  display: flex;
  flex: 1;
}

.app-sidebar {
  width: 260px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
}

.sidebar-role-indicator {
  background: var(--bnb-purple-light);
  border: 1px solid #ddd6fe;
  padding: 0.85rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.sidebar-role-indicator small {
  color: #6b21a8;
  font-size: 0.72rem;
  text-transform: uppercase;
  font-weight: 700;
}

.sidebar-role-indicator strong {
  color: var(--bnb-purple);
  font-size: 0.95rem;
}

.area-tag {
  font-size: 0.75rem;
  color: #64748b;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  border-radius: 8px;
  color: #475569;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.nav-link.active {
  background: var(--bnb-green-light);
  color: var(--bnb-green);
  font-weight: 600;
}

.nav-icon {
  width: 18px;
}

.sidebar-footer {
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: #94a3b8;
  font-size: 0.75rem;
}

.app-main {
  flex: 1;
  padding: 1.75rem 2rem;
  background: #f8fafc;
  overflow-y: auto;
  overflow-x: hidden;
  min-width: 0;
  max-width: 100%;
}

.app-header :deep(svg) {
  width: 1.15em;
  height: 1.15em;
  vertical-align: -0.15em;
}

@media (max-width: 768px) {
  .app-header {
    height: auto;
    min-height: 52px;
    padding: 0.4rem 0.65rem;
    gap: 0.35rem;
  }

  .header-left {
    gap: 0.4rem;
    flex: 1;
    min-width: 0;
  }

  .header-right {
    gap: 0.3rem;
    flex-shrink: 0;
  }

  .mobile-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    flex-shrink: 0;
  }

  .brand {
    min-width: 0;
    gap: 0.4rem;
  }

  .brand-badge {
    font-size: 0.68rem;
    padding: 0.15rem 0.35rem;
    flex-shrink: 0;
  }

  .brand-title {
    font-size: 0.82rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .brand-subtitle {
    display: none;
  }

  .user-pill {
    padding: 0.15rem;
    background: transparent;
    border: none;
    max-width: 2.5rem;
  }

  .user-info {
    display: none;
  }

  .logout-btn {
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    justify-content: center;
  }

  .app-sidebar {
    position: fixed;
    top: 64px;
    bottom: 0;
    left: 0;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.25s ease-in-out;
    box-shadow: 4px 0 16px rgba(0,0,0,0.1);
  }
  .app-sidebar.mobile-open {
    transform: translateX(0);
  }
  .app-main {
    padding: 1rem;
  }
  .btn-text {
    display: none;
  }
}
</style>

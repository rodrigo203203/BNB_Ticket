import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth.store';
import { Role } from '@bnb/shared';

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('inicia con estado no autenticado', () => {
    const auth = useAuthStore();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
  });

  it('valida permisos con hasRole correctamente', () => {
    const auth = useAuthStore();
    auth.user = {
      id: 'test-uuid',
      email: 'analista@bnb.com.bo',
      fullName: 'Test Analyst',
      jobTitle: null,
      avatarUrl: null,
      role: Role.ANALISTA,
      area: 'Datos',
      isActive: true,
      isLocked: false,
      failedAttempts: 0,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(auth.isAuthenticated).toBe(true);
    expect(auth.hasRole([Role.ANALISTA, Role.ADMINISTRADOR])).toBe(true);
    expect(auth.hasRole([Role.SOLICITANTE])).toBe(false);
  });
});

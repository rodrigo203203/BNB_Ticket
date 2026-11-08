import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiClient } from '../api/client';
import { UserSummary, Role, AuthLoginResponse } from '@bnb/shared';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserSummary | null>(null);
  const loading = ref<boolean>(false);
  const initialized = ref<boolean>(false);
  const errorMessage = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value);
  const userRole = computed(() => user.value?.role || null);
  const userFullName = computed(() => user.value?.fullName || '');
  const userArea = computed(() => user.value?.area || '');

  const hasRole = (roles: Role[]) => {
    if (!user.value) return false;
    return roles.includes(user.value.role);
  };

  async function login(email: string, password: string): Promise<boolean> {
    loading.value = true;
    errorMessage.value = null;

    try {
      const response = await apiClient.post<any, { success: boolean; data: AuthLoginResponse }>('/auth/login', {
        email,
        password,
      });

      const data = response.data || (response as any);
      user.value = data.user;
      return true;
    } catch (err: any) {
      const apiMessage = err.response?.data?.error?.message;
      errorMessage.value = Array.isArray(apiMessage)
        ? apiMessage.join('. ')
        : apiMessage || 'Error al iniciar sesión';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMe(): Promise<boolean> {
    loading.value = true;
    try {
      const response = await apiClient.get<any, { success: boolean; data: UserSummary }>('/auth/me', {
        skipGlobalErrorHandler: true,
      });
      user.value = response.data || (response as any);
      return true;
    } catch {
      user.value = null;
      return false;
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }

  async function updateProfile(payload: {
    fullName: string;
    jobTitle?: string;
    area: string;
  }): Promise<UserSummary> {
    const response = await apiClient.patch<any, { success: boolean; data: UserSummary }>(
      '/auth/profile',
      payload,
    );
    const updated = response.data || (response as unknown as UserSummary);
    user.value = updated;
    return updated;
  }

  async function uploadAvatar(file: File): Promise<UserSummary> {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post<any, { success: boolean; data: UserSummary }>(
      '/auth/profile/avatar',
      form,
    );
    const updated = response.data || (response as unknown as UserSummary);
    user.value = updated;
    return updated;
  }

  async function deleteAvatar(): Promise<UserSummary> {
    const response = await apiClient.delete<any, { success: boolean; data: UserSummary }>(
      '/auth/profile/avatar',
    );
    const updated = response.data || (response as unknown as UserSummary);
    user.value = updated;
    return updated;
  }

  async function logout(): Promise<void> {
    loading.value = true;
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignorar errores en logout
    } finally {
      user.value = null;
      loading.value = false;
    }
  }

  return {
    user,
    loading,
    initialized,
    errorMessage,
    isAuthenticated,
    userRole,
    userFullName,
    userArea,
    hasRole,
    login,
    fetchMe,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    logout,
  };
});

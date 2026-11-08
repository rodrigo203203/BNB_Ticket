import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiClient } from '../api/client';
import { DashboardStats } from '@bnb/shared';

export const useDashboardStore = defineStore('dashboard', () => {
  const metrics = ref<DashboardStats | null>(null);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  async function fetchMetrics(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<any, { success: boolean; data: DashboardStats }>('/dashboard/metrics');
      metrics.value = response.data || (response as any);
    } catch (err: any) {
      error.value = err.message || 'Error al cargar métricas del dashboard';
    } finally {
      loading.value = false;
    }
  }

  return {
    metrics,
    loading,
    error,
    fetchMetrics,
  };
});

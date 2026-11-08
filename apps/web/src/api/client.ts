import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '@bnb/shared';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipGlobalErrorHandler?: boolean;
  }
}

/** En dev usamos el proxy de Vite (`/api`) para cookies same-origin con la SPA. */
function resolveApiBase(): string {
  if (import.meta.env.DEV) {
    return '/api/v1';
  }
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl?.startsWith('/')) {
    return envUrl;
  }
  return envUrl || '/api/v1';
}

export const apiClient = axios.create({
  baseURL: resolveApiBase(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2] as string) : null;
}

// Interceptor de petición: adjuntar token CSRF automáticamente
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const csrfToken = getCookie('bnb_csrf_token');
    if (csrfToken) {
      config.headers['x-csrf-token'] = csrfToken;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Bus de eventos para notificaciones globales
export const errorEventBus = {
  listeners: [] as Array<(msg: { title: string; detail: string; severity: 'error' | 'warn' | 'info' }) => void>,
  emit(msg: { title: string; detail: string; severity: 'error' | 'warn' | 'info' }) {
    this.listeners.forEach((fn) => fn(msg));
  },
  subscribe(fn: (msg: { title: string; detail: string; severity: 'error' | 'warn' | 'info' }) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  },
};

// Interceptor de respuesta: manejo centralizado de errores
apiClient.interceptors.response.use(
  (response) => {
    // Si la API devuelve { success: true, data: ... }
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data;
    }
    return response;
  },
  (error: AxiosError<ApiResponse<null>>) => {
    const config = error.config as InternalAxiosRequestConfig & { skipGlobalErrorHandler?: boolean };
    if (config?.skipGlobalErrorHandler) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const requestUrl = config?.url || '';
    if (status === 401 && requestUrl.includes('/auth/me')) {
      return Promise.reject(error);
    }

    const apiError = error.response?.data?.error;
    const message = Array.isArray(apiError?.message)
      ? apiError.message.join(', ')
      : apiError?.message || error.message || 'Error inesperado';

    if (status === 401) {
      // Sesión expirada o credenciales inválidas
      errorEventBus.emit({
        title: 'Sesión no autorizada',
        detail: message,
        severity: 'warn',
      });
    } else if (status === 403) {
      errorEventBus.emit({
        title: 'Acceso Denegado (RBAC)',
        detail: message,
        severity: 'error',
      });
    } else if (status && status >= 500) {
      errorEventBus.emit({
        title: 'Error de Servidor',
        detail: 'Ocurrió un problema en los servicios internos. Intente más tarde.',
        severity: 'error',
      });
    }

    return Promise.reject(error);
  },
);

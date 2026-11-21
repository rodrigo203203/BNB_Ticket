import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { resolverTargetProxyApi } from './src/config/resolver-proxy-api';

/** Monorepo: `.env` maestro en la raíz (no solo `apps/web`). */
const envDir = path.resolve(__dirname, '../..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '');
  const proxyTarget = resolverTargetProxyApi(env);

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@bnb/shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
    },
    optimizeDeps: {
      include: [
        'primevue/tag',
        'primevue/chart',
        'primevue/datepicker',
        'primevue/button',
        'primevue/multiselect',
        'primevue/select',
      ],
    },
    envDir,
    server: {
      /** Escucha en IPv4 explícito (evita solo [::1] en algunos entornos Windows). */
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
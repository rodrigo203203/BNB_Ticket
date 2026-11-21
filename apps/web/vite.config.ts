import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
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
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});

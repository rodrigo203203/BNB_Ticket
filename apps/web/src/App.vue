<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { errorEventBus } from './api/client';

const toast = useToast();
let unsubscribe: (() => void) | null = null;

onMounted(() => {
  unsubscribe = errorEventBus.subscribe((msg) => {
    toast.add({
      severity: msg.severity,
      summary: msg.title,
      detail: msg.detail,
      life: 5000,
    });
  });
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});
</script>

<template>
  <Toast position="top-right" />
  <router-view />
</template>

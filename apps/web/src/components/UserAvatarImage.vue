<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { UserSummary } from '@bnb/shared';
import { resolveAvatarSrc } from '../utils/avatar';

const props = defineProps<{
  user: UserSummary | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
}>();

const loadFailed = ref(false);

const src = computed(() => (loadFailed.value ? null : resolveAvatarSrc(props.user)));

const initials = computed(() =>
  props.user?.fullName ? props.user.fullName.charAt(0).toUpperCase() : '?',
);

watch(
  () => [props.user?.avatarUrl, props.user?.updatedAt],
  () => {
    loadFailed.value = false;
  },
);

function onImgError() {
  loadFailed.value = true;
}
</script>

<template>
  <div :class="['user-avatar-image', size || 'md']">
    <img v-if="src" :src="src" :alt="alt || 'Avatar'" @error="onImgError" />
    <span v-else class="initials">{{ initials }}</span>
  </div>
</template>

<style scoped>
.user-avatar-image {
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bnb-purple);
  color: #fff;
  font-weight: 700;
  flex-shrink: 0;
}

.user-avatar-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar-image.sm {
  width: 32px;
  height: 32px;
  font-size: 0.85rem;
}

.user-avatar-image.md {
  width: 36px;
  height: 36px;
  font-size: 0.95rem;
}

.user-avatar-image.lg {
  width: 100%;
  height: 100%;
  font-size: 2.5rem;
}
</style>

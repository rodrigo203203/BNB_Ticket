import { UserSummary } from '@bnb/shared';

/** Misma origen que la SPA (proxy Vite `/api` → backend) para enviar cookies en `<img>`. */
export function resolveAvatarSrc(user: UserSummary | null | undefined): string | null {
  if (!user?.avatarUrl) return null;
  const path = user.avatarUrl.startsWith('/') ? user.avatarUrl : `/${user.avatarUrl}`;
  const cacheBuster = user.updatedAt ? `?v=${encodeURIComponent(user.updatedAt)}` : '';
  return `/api/v1${path}${cacheBuster}`;
}

/**
 * Resuelve el target del proxy `/api` de Vite en desarrollo.
 * Prioridad: VITE_API_PROXY_TARGET → http://localhost:${PORT} → http://localhost:3000
 */
export function resolverTargetProxyApi(
  env: Record<string, string | undefined>,
): string {
  const explicito = env.VITE_API_PROXY_TARGET?.trim();
  if (explicito) {
    return explicito;
  }
  const port = env.PORT?.trim();
  if (port) {
    return `http://127.0.0.1:${port}`;
  }
  return 'http://127.0.0.1:3000';
}
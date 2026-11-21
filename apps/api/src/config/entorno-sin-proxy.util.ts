/**
 * Entorno para Prisma sin proxy corporativo (evita fallos de descarga de engines en Windows).
 */
const CLAVES_PROXY = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'http_proxy',
  'https_proxy',
  'ALL_PROXY',
  'all_proxy',
] as const;

export function entornoSinProxy(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env = { ...base };
  for (const k of CLAVES_PROXY) {
    delete env[k];
  }
  if (!env.PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING) {
    env.PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = '1';
  }
  env.NO_PROXY = [env.NO_PROXY, '127.0.0.1', 'localhost'].filter(Boolean).join(',');
  return env;
}
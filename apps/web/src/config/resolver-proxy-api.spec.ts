import { describe, expect, it } from 'vitest';
import { resolverTargetProxyApi } from './resolver-proxy-api';

describe('resolverTargetProxyApi', () => {
  it('usa VITE_API_PROXY_TARGET si está definido', () => {
    expect(
      resolverTargetProxyApi({
        VITE_API_PROXY_TARGET: 'http://127.0.0.1:3005',
        PORT: '3999',
      }),
    ).toBe('http://127.0.0.1:3005');
  });

  it('construye URL desde PORT si no hay target explícito', () => {
    expect(resolverTargetProxyApi({ PORT: '3005' })).toBe('http://127.0.0.1:3005');
  });

  it('respalda 3000 si no hay PORT ni target', () => {
    expect(resolverTargetProxyApi({})).toBe('http://127.0.0.1:3000');
  });
});
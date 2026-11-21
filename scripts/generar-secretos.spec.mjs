import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { aplicarSecretosEnContenido } from './generar-secretos.mjs';

describe('generar-secretos.mjs', () => {
  it('rellena solo secretos vacíos sin pisar existentes', () => {
    const inicio = 'PORT=3005\r\nJWT_ACCESS_SECRET=\r\nJWT_REFRESH_SECRET=ya_definido\r\n';
    const { contenido, cambios } = aplicarSecretosEnContenido(inicio);
    assert.ok(cambios > 0);
    assert.match(contenido, /JWT_REFRESH_SECRET=ya_definido/);
    assert.match(contenido, /JWT_ACCESS_SECRET=[A-Za-z0-9_-]+/);
    assert.ok(contenido.includes('\r\n'));
  });

  it('--forzar regenera aunque existan', () => {
    const inicio = 'JWT_ACCESS_SECRET=viejo\r\n';
    const { contenido, cambios } = aplicarSecretosEnContenido(inicio, { forzar: true });
    assert.ok(cambios > 0);
    assert.ok(!contenido.includes('JWT_ACCESS_SECRET=viejo'));
  });

  it('maneja CRLF y añade claves faltantes', () => {
    const { contenido } = aplicarSecretosEnContenido('NODE_ENV=development\r\n');
    assert.match(contenido, /SESSION_COOKIE_SECRET=/);
    assert.ok(contenido.includes('\r\n'));
  });
});
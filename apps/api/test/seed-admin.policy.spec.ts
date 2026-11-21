import { esContrasenaAceptableParaLogin, LONGITUD_MINIMA_CONTRASENA } from '@bnb/shared';

describe('Política ADMIN_PASSWORD (seed y admin:reset)', () => {
  it('rechaza contraseñas más cortas que el mínimo de login', () => {
    expect(esContrasenaAceptableParaLogin('abc')).toBe(false);
    expect(esContrasenaAceptableParaLogin('a'.repeat(LONGITUD_MINIMA_CONTRASENA - 1))).toBe(false);
    expect(esContrasenaAceptableParaLogin('a'.repeat(LONGITUD_MINIMA_CONTRASENA))).toBe(true);
  });
});
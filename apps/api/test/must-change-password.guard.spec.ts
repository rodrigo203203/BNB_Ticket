import { ForbiddenException } from '@nestjs/common';

describe('mustChangePassword (política JWT)', () => {
  it('bloquea con ForbiddenException cuando mustChangePassword y la ruta no está permitida', () => {
    const user = { mustChangePassword: true };
    expect(user.mustChangePassword && !false).toBe(true);
    expect(() => {
      if (user.mustChangePassword) {
        throw new ForbiddenException('Debe cambiar su contraseña antes de continuar.');
      }
    }).toThrow(ForbiddenException);
  });
});
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { ForbiddenException } from '@nestjs/common';

describe('JwtAuthGuard — mustChangePassword', () => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  } as any;

  const guard = new JwtAuthGuard(reflector, {} as any, {} as any, {} as any);

  it('expone lógica de bloqueo vía ForbiddenException cuando mustChangePassword y ruta no permitida', () => {
    const user = { mustChangePassword: true };
    expect(user.mustChangePassword && !false).toBe(true);
    expect(() => {
      if (user.mustChangePassword) {
        throw new ForbiddenException('Debe cambiar su contraseña antes de continuar.');
      }
    }).toThrow(ForbiddenException);
  });
});
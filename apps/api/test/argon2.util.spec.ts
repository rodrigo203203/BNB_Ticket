import { hashPassword, verifyPassword } from '../src/common/utils/argon2.util';

describe('Argon2id Util', () => {
  it('debe generar un hash Argon2id válido y verificar la contraseña correcta', async () => {
    const plain = 'BnbSecurePassword2026!';
    const hash = await hashPassword(plain);

    expect(hash).toBeDefined();
    expect(hash.startsWith('$argon2id$')).toBe(true);

    const isMatch = await verifyPassword(plain, hash);
    expect(isMatch).toBe(true);
  });

  it('debe rechazar una contraseña incorrecta', async () => {
    const plain = 'CorrectPassword123!';
    const hash = await hashPassword(plain);

    const isMatch = await verifyPassword('WrongPassword!', hash);
    expect(isMatch).toBe(false);
  });
});

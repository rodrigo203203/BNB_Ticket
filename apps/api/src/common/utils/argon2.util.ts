import * as argon2 from '@node-rs/argon2';

/**
 * Utilidad centralizada de Argon2id para autenticación bancaria robusta
 */
export async function hashPassword(plainText: string): Promise<string> {
  return argon2.hash(plainText, {
    memoryCost: 19456, // 19 MiB recomendado OWASP
    timeCost: 2,       // 2 iteraciones
    outputLen: 32,
    parallelism: 1,
    algorithm: argon2.Algorithm.Argon2id,
  });
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainText);
  } catch {
    return false;
  }
}

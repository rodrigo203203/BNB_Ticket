/** Misma regla que LoginDto (@MinLength(8) en la API). */
export const LONGITUD_MINIMA_CONTRASENA = 8;

export function esContrasenaAceptableParaLogin(contrasena: string | undefined | null): boolean {
  return typeof contrasena === 'string' && contrasena.trim().length >= LONGITUD_MINIMA_CONTRASENA;
}
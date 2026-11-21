/**
 * Desbloquea la cuenta admin y opcionalmente asigna una nueva contraseña (sin mostrarla en consola).
 * Uso: npm run admin:reset [--workspace=@bnb/api] con ADMIN_EMAIL opcional y ADMIN_PASSWORD si cambia clave.
 */
import '../src/config/cargar-entorno';
import { PrismaClient } from '@prisma/client';
import { esContrasenaAceptableParaLogin, LONGITUD_MINIMA_CONTRASENA } from '@bnb/shared';
import { hashPassword } from '../src/common/utils/argon2.util';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@bnb.com.bo').trim().toLowerCase();
  const nuevaContrasena = process.env.ADMIN_PASSWORD?.trim();

  const usuario = await prisma.user.findUnique({ where: { email } });
  if (!usuario) {
    console.error(`No existe un usuario con email ${email}. Ejecute seed:admin primero.`);
    process.exit(1);
  }

  if (nuevaContrasena && !esContrasenaAceptableParaLogin(nuevaContrasena)) {
    console.error(
      `ADMIN_PASSWORD no cumple la política de login (mínimo ${LONGITUD_MINIMA_CONTRASENA} caracteres).`,
    );
    process.exit(1);
  }

  const data: {
    isLocked: boolean;
    failedAttempts: number;
    lockedUntil: null;
    passwordHash?: string;
    mustChangePassword?: boolean;
  } = {
    isLocked: false,
    failedAttempts: 0,
    lockedUntil: null,
  };

  if (nuevaContrasena) {
    data.passwordHash = await hashPassword(nuevaContrasena);
    data.mustChangePassword = false;
  }

  await prisma.user.update({ where: { id: usuario.id }, data });

  if (nuevaContrasena) {
    console.log(`[OK] Cuenta ${email} desbloqueada (intentos en 0) y contraseña actualizada desde ADMIN_PASSWORD.`);
  } else {
    console.log(`[OK] Cuenta ${email} desbloqueada (intentos en 0). Para cambiar clave defina ADMIN_PASSWORD en .env.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
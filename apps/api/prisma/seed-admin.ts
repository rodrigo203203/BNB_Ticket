import '../src/config/cargar-entorno';
import { PrismaClient, Role } from '@prisma/client';
import { esContrasenaAceptableParaLogin, LONGITUD_MINIMA_CONTRASENA } from '@bnb/shared';
import { hashPassword } from '../src/common/utils/argon2.util';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

function debeMostrarContrasenasEnConsola(): boolean {
  return (
    process.argv.includes('--mostrar-contrasenas') ||
    process.env.SEED_MOSTRAR_CONTRASENAS === '1'
  );
}

function generarClaveSegura(): string {
  // 16 bytes → base64url (~22 caracteres) + sufijo para cumplir política mínima
  return `Bnb!${randomBytes(12).toString('base64url')}`;
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@bnb.com.bo').trim().toLowerCase();
  const fullName = process.env.ADMIN_FULL_NAME || 'Administrador del Sistema';
  const area = process.env.ADMIN_AREA || 'Tecnología';

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    console.log(`✅ El administrador ${email} ya existe; no se modificó nada.`);
    return;
  }

  let password = process.env.ADMIN_PASSWORD?.trim();
  let mostrarUnaVez = false;
  if (!password) {
    password = generarClaveSegura();
    mostrarUnaVez = true;
  } else if (!esContrasenaAceptableParaLogin(password)) {
    console.error(
      `ADMIN_PASSWORD no cumple la política de login (mínimo ${LONGITUD_MINIMA_CONTRASENA} caracteres). Corrija .env sin mostrar la contraseña en consola.`,
    );
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash,
      role: Role.ADMINISTRADOR,
      area,
      mustChangePassword: true,
    },
  });

  console.log(`✅ Administrador creado: ${email}`);
  if (mostrarUnaVez && debeMostrarContrasenasEnConsola()) {
    console.log('⚠️  Contraseña inicial (mostrar solo esta vez, no se guarda en texto plano):');
    console.log(password);
  } else if (mostrarUnaVez) {
    console.log(
      'Contraseña generada automáticamente (no se muestra). Defina ADMIN_PASSWORD en .env o use SEED_MOSTRAR_CONTRASENAS=1.',
    );
  } else {
    console.log('Contraseña tomada de ADMIN_PASSWORD (no se muestra en consola).');
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
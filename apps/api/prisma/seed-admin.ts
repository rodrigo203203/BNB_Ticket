import '../src/config/cargar-entorno';
import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/common/utils/argon2.util';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

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
  if (mostrarUnaVez) {
    console.log('⚠️  Contraseña inicial (mostrar solo esta vez, no se guarda en texto plano):');
    console.log(password);
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
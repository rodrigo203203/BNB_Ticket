import '../src/config/cargar-entorno';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
import {
  PrismaClient,
  Role,
  RequestStatus,
  RequestPriority,
  RequestCategory,
  AuditAction,
} from '@prisma/client';
import { hashPassword } from '../src/common/utils/argon2.util';

const prisma = new PrismaClient();

/** Por defecto no imprimir contraseñas (repos públicos / logs). */
function debeMostrarContrasenasEnConsola(): boolean {
  return (
    process.argv.includes('--mostrar-contrasenas') ||
    process.env.SEED_MOSTRAR_CONTRASENAS === '1'
  );
}

function generarClaveDemo(): string {
  return process.env.DEMO_SEED_PASSWORD || `Demo!${randomBytes(10).toString('base64url')}`;
}

/** Fecha UTC mediodía para datos reproducibles en capturas y Gantt. */
function diaUtc(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

const ZONA_DEMO = 'America/La_Paz';

function diaCalendarioLaPaz(ref: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_DEMO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ref);
}

/** Mediodía UTC del día calendario en La Paz (alineado con @bnb/shared M13). */
function desdeDiaLaPaz(isoDia: string): Date {
  return new Date(`${isoDia}T12:00:00.000Z`);
}

function diaRelativoLaPaz(deltaDias: number, ref: Date = new Date()): Date {
  const hoy = diaCalendarioLaPaz(ref);
  return new Date(desdeDiaLaPaz(hoy).getTime() + deltaDias * 86_400_000);
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ seed-demo no puede ejecutarse en producción (NODE_ENV=production).');
    process.exit(1);
  }

  console.log('🌱 Iniciando seed sintético para Plataforma BNB (solo desarrollo)...');

  await prisma.solicitudHistory.deleteMany();
  await prisma.solicitudAdjunto.deleteMany();
  await prisma.solicitud.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = generarClaveDemo();
  const hashedPassword = await hashPassword(defaultPassword);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@bnb.com.bo',
      fullName: 'Carlos Morales',
      jobTitle: 'Administrador de Seguridad TI',
      passwordHash: hashedPassword,
      role: Role.ADMINISTRADOR,
      area: 'Seguridad y Arquitectura de Datos',
      isActive: true,
      isLocked: false,
    },
  });

  await prisma.user.create({
    data: {
      email: 'coordinador@bnb.com.bo',
      fullName: 'Valeria Quispe',
      jobTitle: 'Coordinadora de Gobierno y Analítica',
      passwordHash: hashedPassword,
      role: Role.COORDINADOR,
      area: 'Gobierno y Analítica de Datos',
      isActive: true,
      isLocked: false,
    },
  });

  const analista1 = await prisma.user.create({
    data: {
      email: 'analista@bnb.com.bo',
      fullName: 'Rodrigo Mendoza',
      jobTitle: 'Analista Senior de Datos',
      passwordHash: hashedPassword,
      role: Role.ANALISTA,
      area: 'Ingeniería y Modelado de Datos',
      isActive: true,
      isLocked: false,
    },
  });

  const analista2 = await prisma.user.create({
    data: {
      email: 'analista2@bnb.com.bo',
      fullName: 'Mariana Flores',
      jobTitle: 'Analista de Business Intelligence',
      passwordHash: hashedPassword,
      role: Role.ANALISTA,
      area: 'Inteligencia de Negocios y Reportes',
      isActive: true,
      isLocked: false,
    },
  });

  const solicitante1 = await prisma.user.create({
    data: {
      email: 'solicitante@bnb.com.bo',
      fullName: 'Alejandro Torrico',
      jobTitle: 'Oficial de Riesgos',
      passwordHash: hashedPassword,
      role: Role.SOLICITANTE,
      area: 'Gerencia de Riesgos Crediticios',
      isActive: true,
      isLocked: false,
    },
  });

  const solicitante2 = await prisma.user.create({
    data: {
      email: 'solicitante2@bnb.com.bo',
      fullName: 'Lucía Gutiérrez',
      jobTitle: 'Jefa de Finanzas',
      passwordHash: hashedPassword,
      role: Role.SOLICITANTE,
      area: 'Finanzas y Planificación',
      isActive: true,
      isLocked: false,
    },
  });

  /** Usuario con cambio de clave obligatorio (capturas / flujo CSV). */
  const importadoEmail = (process.env.DEMO_IMPORTADO_EMAIL || 'nuevo.csv@bnb.com.bo').toLowerCase();
  let claveImportado = process.env.DEMO_IMPORTADO_PASSWORD?.trim();
  let mostrarClaveImportado = false;
  if (!claveImportado) {
    claveImportado = `Tmp!${randomBytes(8).toString('base64url')}`;
    mostrarClaveImportado = true;
  }
  await prisma.user.create({
    data: {
      email: importadoEmail,
      fullName: 'Usuario Importado CSV',
      jobTitle: 'Oficial de Cumplimiento',
      passwordHash: await hashPassword(claveImportado),
      role: Role.SOLICITANTE,
      area: 'Cumplimiento Normativo',
      isActive: true,
      mustChangePassword: true,
    },
  });

  if (debeMostrarContrasenasEnConsola()) {
    console.log(`✅ 7 usuarios demo; contraseña común de demo: "${defaultPassword}"`);
    if (mostrarClaveImportado) {
      console.log(`🔑 Usuario ${importadoEmail} (mustChangePassword): "${claveImportado}" — solo esta ejecución`);
    }
  } else {
    console.log(
      '✅ 7 usuarios demo creados. Use DEMO_SEED_PASSWORD en .env o --mostrar-contrasenas para ver claves en consola.',
    );
  }

  const req1 = await prisma.solicitud.create({
    data: {
      code: 'REQ-2026-0001',
      title: 'Extracción de cartera de créditos PyME morosos 2024-2025',
      description:
        'Se requiere dataset consolidado con variables de morosidad, garantías hipotecarias y calificación ASFI para comité de riesgo.',
      category: RequestCategory.EXTRACCION_DATOS,
      priority: RequestPriority.ALTA,
      status: RequestStatus.EN_ANALISIS,
      requesterId: solicitante1.id,
      assignedAnalystId: analista1.id,
      requesterArea: 'Gerencia de Riesgos Crediticios',
      justification: 'Requerimiento normativo regulatorio trimestral de la ASFI.',
      estimatedHours: 16,
      fechaRequerida: diaRelativoLaPaz(8),
      fechaEntrega: null,
      createdAt: diaRelativoLaPaz(-6),
    },
  });

  const uploadRoot = join(process.cwd(), '../../storage/uploads/solicitudes', req1.id);
  mkdirSync(uploadRoot, { recursive: true });
  const storedName = 'especificacion-asfi.pdf';
  const pdfBody = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  );
  writeFileSync(join(uploadRoot, storedName), pdfBody);
  await prisma.solicitudAdjunto.create({
    data: {
      solicitudId: req1.id,
      storedPath: `solicitudes/${req1.id}/${storedName}`,
      originalName: 'Especificacion_ASFI_Riesgo.pdf',
      mimeType: 'application/pdf',
      sizeBytes: pdfBody.length,
      uploadedById: solicitante1.id,
    },
  });

  await prisma.solicitudHistory.createMany({
    data: [
      {
        solicitudId: req1.id,
        authorId: solicitante1.id,
        previousStatus: null,
        newStatus: RequestStatus.REGISTRADA,
        comment: 'Solicitud creada con adjuntos de especificaciones iniciales.',
      },
      {
        solicitudId: req1.id,
        authorId: analista1.id,
        previousStatus: RequestStatus.REGISTRADA,
        newStatus: RequestStatus.EN_ANALISIS,
        comment: 'Tomada por Analista Sr. Rodrigo Mendoza.',
      },
    ],
  });

  const req2 = await prisma.solicitud.create({
    data: {
      code: 'REQ-2026-0002',
      title: 'Dashboard interactivo PowerBI para colocación de microcréditos BNB Móvil',
      description: 'Reporte gerencial mensual con desglose por sucursales.',
      category: RequestCategory.REPORTES_BI,
      priority: RequestPriority.MEDIA,
      status: RequestStatus.EN_REVISION_COORDINACION,
      requesterId: solicitante2.id,
      assignedAnalystId: analista2.id,
      requesterArea: 'Finanzas y Planificación',
      justification: 'Monitoreo de metas comerciales del primer semestre.',
      estimatedHours: 24,
      fechaRequerida: diaRelativoLaPaz(-5),
      fechaEntrega: diaRelativoLaPaz(-2),
      createdAt: diaRelativoLaPaz(-18),
    },
  });

  await prisma.solicitudHistory.createMany({
    data: [
      {
        solicitudId: req2.id,
        authorId: solicitante2.id,
        previousStatus: null,
        newStatus: RequestStatus.REGISTRADA,
        comment: 'Registro de solicitud de nuevo tablero.',
      },
      {
        solicitudId: req2.id,
        authorId: analista2.id,
        previousStatus: RequestStatus.REGISTRADA,
        newStatus: RequestStatus.EN_ANALISIS,
        comment: 'Desarrollo de medidas DAX preliminar.',
      },
      {
        solicitudId: req2.id,
        authorId: analista2.id,
        previousStatus: RequestStatus.EN_ANALISIS,
        newStatus: RequestStatus.EN_REVISION_COORDINACION,
        comment: 'Listo para validación de Coordinación.',
      },
    ],
  });

  const req3 = await prisma.solicitud.create({
    data: {
      code: 'REQ-2026-0003',
      title: 'Modelo predictivo de Churn para clientes de banca patrimonial',
      description: 'Pipeline ML de propensión de abandono.',
      category: RequestCategory.MODELOS_ML,
      priority: RequestPriority.URGENTE,
      status: RequestStatus.APROBADA,
      requesterId: solicitante1.id,
      assignedAnalystId: analista1.id,
      requesterArea: 'Gerencia de Riesgos Crediticios',
      justification: 'Plan estratégico de retención.',
      estimatedHours: 40,
      fechaRequerida: diaUtc(2026, 10, 1),
      fechaEntrega: diaRelativoLaPaz(-3),
      createdAt: diaRelativoLaPaz(-22),
      closedAt: diaRelativoLaPaz(-3),
    },
  });

  await prisma.solicitudHistory.create({
    data: {
      solicitudId: req3.id,
      authorId: solicitante1.id,
      previousStatus: null,
      newStatus: RequestStatus.REGISTRADA,
      comment: 'Registro formal.',
    },
  });

  const req4 = await prisma.solicitud.create({
    data: {
      code: 'REQ-2026-0004',
      title: 'Permisos de lectura a réplica de PostgreSQL de Transacciones BNB',
      description: 'Acceso para usuario de servicio de auditoría externa.',
      category: RequestCategory.ACCESO_BD,
      priority: RequestPriority.BAJA,
      status: RequestStatus.REGISTRADA,
      requesterId: solicitante2.id,
      assignedAnalystId: null,
      requesterArea: 'Finanzas y Planificación',
      justification: 'Auditoría financiera anual.',
      fechaRequerida: diaRelativoLaPaz(-10),
      fechaEntrega: null,
      createdAt: diaRelativoLaPaz(-22),
    },
  });

  await prisma.solicitudHistory.create({
    data: {
      solicitudId: req4.id,
      authorId: solicitante2.id,
      previousStatus: null,
      newStatus: RequestStatus.REGISTRADA,
      comment: 'Solicitud registrada pendiente de asignación.',
    },
  });

  /** Carga ALTA para Rodrigo (≥21 puntos) + mezcla vencida / por vencer / sin entrega en Gantt. */
  const hoy = new Date();
  for (let i = 0; i < 6; i++) {
    const vencidaSinEntrega = i % 2 === 0;
    const fechaRequerida = vencidaSinEntrega ? diaRelativoLaPaz(-8, hoy) : diaRelativoLaPaz(3, hoy);
    const createdAt = vencidaSinEntrega ? diaRelativoLaPaz(-20, hoy) : diaRelativoLaPaz(-5, hoy);
    await prisma.solicitud.create({
      data: {
        code: `REQ-2026-9${100 + i}`,
        title: `Extracción urgente de prueba #${i + 1}`,
        description: 'Ticket sintético seed-demo para carga ALTA y Gantt.',
        category: RequestCategory.EXTRACCION_DATOS,
        priority: RequestPriority.URGENTE,
        status: RequestStatus.EN_ANALISIS,
        requesterId: solicitante2.id,
        assignedAnalystId: analista1.id,
        requesterArea: 'Finanzas y Planificación',
        fechaRequerida,
        /** 9100/9101/9103/9105 sin entrega (barra punteada + tramo rojo si vencida). */
        fechaEntrega: [0, 1, 3, 5].includes(i)
          ? null
          : diaRelativoLaPaz(-1, hoy),
        createdAt,
      },
    });
  }

  const [y, m] = diaCalendarioLaPaz(hoy).split('-').map(Number);

  /** No deben aparecer en Gantt (rechazada / cancelada). */
  await prisma.solicitud.createMany({
    data: [
      {
        code: 'REQ-2026-0998',
        title: 'Solicitud rechazada (excluida del Gantt)',
        description: 'Demo',
        category: RequestCategory.EXTRACCION_DATOS,
        priority: RequestPriority.BAJA,
        status: RequestStatus.RECHAZADA,
        requesterId: solicitante1.id,
        assignedAnalystId: analista1.id,
        requesterArea: 'Gerencia de Riesgos Crediticios',
        fechaRequerida: diaUtc(y, m, 1),
      },
      {
        code: 'REQ-2026-0999',
        title: 'Solicitud cancelada (excluida del Gantt)',
        description: 'Demo',
        category: RequestCategory.EXTRACCION_DATOS,
        priority: RequestPriority.BAJA,
        status: RequestStatus.CANCELADA,
        requesterId: solicitante1.id,
        requesterArea: 'Gerencia de Riesgos Crediticios',
        fechaRequerida: diaUtc(y, m, 2),
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        userEmail: admin.email,
        action: AuditAction.USER_CREATED,
        details: 'Sembrado demo con fechas, adjuntos y carga ALTA.',
        ipAddress: '127.0.0.1',
      },
    ],
  });

  console.log('✅ Seed demo completado (fechas, adjunto, carga ALTA, mustChangePassword).');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la ejecución del seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
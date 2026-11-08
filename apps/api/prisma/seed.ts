import { PrismaClient, Role, RequestStatus, RequestPriority, RequestCategory, AuditAction } from '@prisma/client';
import { hashPassword } from '../src/common/utils/argon2.util';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed sintético para Plataforma BNB...');

  // Limpiar datos existentes respetando orden de dependencias
  await prisma.solicitudHistory.deleteMany();
  await prisma.solicitud.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = 'Password123!';
  const hashedPassword = await hashPassword(defaultPassword);

  // 1. Usuarios representativos de cada rol
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

  const coordinador = await prisma.user.create({
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

  console.log(`✅ 6 usuarios creados con contraseña por defecto: "${defaultPassword}"`);

  // 2. Solicitudes sintéticas con diversos estados
  const req1 = await prisma.solicitud.create({
    data: {
      code: 'REQ-2026-0001',
      title: 'Extracción de cartera de créditos PyME morosos 2024-2025',
      description: 'Se requiere dataset consolidado con variables de morosidad, garantías hipotecarias y calificación ASFI para comité de riesgo.',
      category: RequestCategory.EXTRACCION_DATOS,
      priority: RequestPriority.ALTA,
      status: RequestStatus.EN_ANALISIS,
      requesterId: solicitante1.id,
      assignedAnalystId: analista1.id,
      requesterArea: 'Gerencia de Riesgos Crediticios',
      justification: 'Requerimiento normativo regulatorio trimestral de la ASFI.',
      estimatedHours: 16,
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
        comment: 'Tomada por Analista Sr. Rodrigo Mendoza. Validando accesos al Data Lake de Riesgos.',
      },
    ],
  });

  const req2 = await prisma.solicitud.create({
    data: {
      code: 'REQ-2026-0002',
      title: 'Dashboard interactivo PowerBI para colocación de microcréditos BNB Móvil',
      description: 'Reporte gerencial mensual con desglose por sucursales La Paz, Santa Cruz y Cochabamba, incluyendo tasa de conversión y embudo digital.',
      category: RequestCategory.REPORTES_BI,
      priority: RequestPriority.MEDIA,
      status: RequestStatus.EN_REVISION_COORDINACION,
      requesterId: solicitante2.id,
      assignedAnalystId: analista2.id,
      requesterArea: 'Finanzas y Planificación',
      justification: 'Monitoreo de metas comerciales del primer semestre.',
      estimatedHours: 24,
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
        comment: 'Desarrollo de medidas DAX y layout preliminar en PowerBI.',
      },
      {
        solicitudId: req2.id,
        authorId: analista2.id,
        previousStatus: RequestStatus.EN_ANALISIS,
        newStatus: RequestStatus.EN_REVISION_COORDINACION,
        comment: 'Tablero finalizado en ambiente QA, listo para validación y pase a prod de Coordinación.',
      },
    ],
  });

  const req3 = await prisma.solicitud.create({
    data: {
      code: 'REQ-2026-0003',
      title: 'Modelo predictivo de Churn para clientes de banca patrimonial',
      description: 'Desarrollo de pipeline de ML para calcular propensión de abandono o disminución de saldos en cuentas de inversión.',
      category: RequestCategory.MODELOS_ML,
      priority: RequestPriority.URGENTE,
      status: RequestStatus.APROBADA,
      requesterId: solicitante1.id,
      assignedAnalystId: analista1.id,
      requesterArea: 'Gerencia de Riesgos Crediticios',
      justification: 'Iniciativa prioritaria del plan estratégico de retención de banca personas.',
      estimatedHours: 40,
      closedAt: new Date(),
    },
  });

  await prisma.solicitudHistory.createMany({
    data: [
      {
        solicitudId: req3.id,
        authorId: solicitante1.id,
        previousStatus: null,
        newStatus: RequestStatus.REGISTRADA,
        comment: 'Registro formal de requerimiento de modelo analítico.',
      },
      {
        solicitudId: req3.id,
        authorId: analista1.id,
        previousStatus: RequestStatus.REGISTRADA,
        newStatus: RequestStatus.EN_ANALISIS,
        comment: 'Entrenamiento de modelos LightGBM y validación cruzada con AUC de 0.89.',
      },
      {
        solicitudId: req3.id,
        authorId: analista1.id,
        previousStatus: RequestStatus.EN_ANALISIS,
        newStatus: RequestStatus.EN_REVISION_COORDINACION,
        comment: 'Modelo entregado con documentación de gobernanza y validación de features.',
      },
      {
        solicitudId: req3.id,
        authorId: coordinador.id,
        previousStatus: RequestStatus.EN_REVISION_COORDINACION,
        newStatus: RequestStatus.APROBADA,
        comment: 'Aprobado formalmente por la coordinación. Listo para consumo en producción.',
      },
    ],
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

  // 3. Auditoría inicial
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        userEmail: admin.email,
        action: AuditAction.USER_CREATED,
        details: 'Sembrado inicial del sistema y perfiles de seguridad.',
        ipAddress: '127.0.0.1',
      },
      {
        userId: solicitante1.id,
        userEmail: solicitante1.email,
        action: AuditAction.REQUEST_CREATED,
        details: 'Creación de ticket REQ-2026-0001',
        ipAddress: '127.0.0.1',
      },
    ],
  });

  console.log('✅ Seed completado con éxito: usuarios, tickets, historiales y auditoría inicial.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la ejecución del seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NivelCarga,
  resumirCargaDesdeSolicitudes,
  Role,
  SolicitudCargaRow,
  UserSummary,
} from '@bnb/shared';

export type PersonaCargaDto = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  area: string;
  puntosCarga: number;
  nivel: NivelCarga;
  activas: number;
  porEstado: Record<string, number>;
  vencidas: number;
  porVencer: number;
  proximaFechaEntrega: string | null;
  proximaSolicitudCodigo: string | null;
  proximaSolicitudId: string | null;
};

@Injectable()
export class EquipoCargaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Spark M11: el analista solo accede a su propia fila; coordinador/admin ven el equipo. */
  private assertPuedeVerCargaEquipo(user: UserSummary) {
    const permitido =
      user.role === Role.ANALISTA ||
      user.role === Role.COORDINADOR ||
      user.role === Role.ADMINISTRADOR;
    if (!permitido) {
      throw new ForbiddenException('No tiene permisos para ver la carga del equipo');
    }
  }

  /** Carga actual de un encargado (cálculo en servidor, p. ej. al asignar). */
  async calcularCargaUsuarioId(userId: string, ahora = new Date()) {
    const solicitudes = await this.prisma.solicitud.findMany({
      where: { assignedAnalystId: userId },
      select: {
        id: true,
        code: true,
        status: true,
        priority: true,
        fechaRequerida: true,
        fechaEntrega: true,
        assignedAnalystId: true,
      },
    });
    const rows: SolicitudCargaRow[] = solicitudes.map((s: (typeof solicitudes)[number]) => ({
      id: s.id,
      code: s.code,
      status: s.status as any,
      priority: s.priority as any,
      fechaRequerida: s.fechaRequerida,
      fechaEntrega: s.fechaEntrega,
      assignedAnalystId: s.assignedAnalystId,
    }));
    return resumirCargaDesdeSolicitudes(rows, ahora);
  }

  async obtenerCargaEquipo(user: UserSummary): Promise<{
    resumen: {
      personas: number;
      activasTotales: number;
      vencidasTotales: number;
      porVencerTotales: number;
    };
    personas: PersonaCargaDto[];
  }> {
    this.assertPuedeVerCargaEquipo(user);

    const rolesAsignables = [Role.ANALISTA, Role.COORDINADOR, Role.ADMINISTRADOR];
    const whereUsers: { isActive: boolean; role: { in: Role[] }; id?: string } = {
      isActive: true,
      role: { in: rolesAsignables },
    };
    if (user.role === Role.ANALISTA) {
      whereUsers.id = user.id;
    }

    const personas = await this.prisma.user.findMany({
      where: whereUsers,
      select: { id: true, fullName: true, email: true, role: true, area: true },
      orderBy: { fullName: 'asc' },
    });

    const ids = personas.map((p: (typeof personas)[number]) => p.id);
    const solicitudes = await this.prisma.solicitud.findMany({
      where: { assignedAnalystId: { in: ids } },
      select: {
        id: true,
        code: true,
        status: true,
        priority: true,
        fechaRequerida: true,
        fechaEntrega: true,
        assignedAnalystId: true,
      },
    });

    const porPersona = new Map<string, SolicitudCargaRow[]>();
    for (const id of ids) porPersona.set(id, []);
    for (const s of solicitudes) {
      if (!s.assignedAnalystId) continue;
      porPersona.get(s.assignedAnalystId)?.push({
        id: s.id,
        code: s.code,
        status: s.status as any,
        priority: s.priority as any,
        fechaRequerida: s.fechaRequerida,
        fechaEntrega: s.fechaEntrega,
        assignedAnalystId: s.assignedAnalystId,
      });
    }

    const filas: PersonaCargaDto[] = personas.map((p: (typeof personas)[number]) => {
      const res = resumirCargaDesdeSolicitudes(porPersona.get(p.id) ?? []);
      return {
        id: p.id,
        fullName: p.fullName,
        email: p.email,
        role: p.role as Role,
        area: p.area,
        puntosCarga: res.puntosCarga,
        nivel: res.nivel,
        activas: res.activas,
        porEstado: res.porEstado as Record<string, number>,
        vencidas: res.vencidas,
        porVencer: res.porVencer,
        proximaFechaEntrega: res.proximaFechaEntrega,
        proximaSolicitudCodigo: res.proximaSolicitudCodigo,
        proximaSolicitudId: res.proximaSolicitudId,
      };
    });

    // Vista principal: mayor carga primero (Spark M10); el modal de asignación usa /users/assignable (asc).
    filas.sort((a, b) => b.puntosCarga - a.puntosCarga);

    const activasTotales = filas.reduce((a, f) => a + f.activas, 0);
    const vencidasTotales = filas.reduce((a, f) => a + f.vencidas, 0);
    const porVencerTotales = filas.reduce((a, f) => a + f.porVencer, 0);

    return {
      resumen: {
        personas: filas.length,
        activasTotales,
        vencidasTotales,
        porVencerTotales,
      },
      personas: filas,
    };
  }
}
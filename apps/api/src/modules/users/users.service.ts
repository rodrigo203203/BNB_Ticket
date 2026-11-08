import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, AuditAction, UserSummary } from '@bnb/shared';
import { mapUserToSummary } from '../../common/utils/user-summary.util';
import { hashPassword } from '../../common/utils/argon2.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string, role?: Role): Promise<UserSummary[]> {
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { area: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => this.mapToSummary(u));
  }

  /**
   * Obtiene todos los usuarios que pueden ser asignados como encargados de tickets.
   * Regla de negocio: Se puede asignar a todos los usuarios creados EXCEPTO con el rol de SOLICITANTE.
   */
  async findAssignableAnalysts(): Promise<Array<{ id: string; fullName: string; email: string; role: Role; area: string }>> {
    const users = await this.prisma.user.findMany({
      where: {
        role: { not: 'SOLICITANTE' as any },
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        area: true,
      },
      orderBy: [
        { role: 'asc' },
        { fullName: 'asc' },
      ],
    });

    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role as unknown as Role,
      area: u.area,
    }));
  }

  async findOne(id: string): Promise<UserSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return this.mapToSummary(user);
  }

  async create(dto: CreateUserDto, currentAdmin: UserSummary): Promise<UserSummary> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un usuario registrado con el correo ${dto.email}`);
    }

    const hashedPassword = await hashPassword(dto.password);

    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        fullName: dto.fullName.trim(),
        passwordHash: hashedPassword,
        role: dto.role as any,
        area: dto.area.trim(),
        isActive: true,
        isLocked: false,
        failedAttempts: 0,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentAdmin.id,
        userEmail: currentAdmin.email,
        action: AuditAction.USER_CREATED,
        details: `Administrador creó el usuario ${newUser.fullName} (${newUser.email}) con rol ${newUser.role} en el área ${newUser.area}.`,
      },
    }).catch(() => {});

    return this.mapToSummary(newUser);
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    currentAdmin: UserSummary,
  ): Promise<UserSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // No permitir que el admin se desactive o bloquee a sí mismo
    if (user.id === currentAdmin.id && (dto.isActive === false || dto.isLocked === true)) {
      throw new BadRequestException('No puedes desactivar o bloquear tu propia cuenta de administrador.');
    }

    const data: any = {};
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (dto.isLocked !== undefined) {
      data.isLocked = dto.isLocked;
      if (dto.isLocked === false) {
        data.failedAttempts = 0;
        data.lockedUntil = null;
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentAdmin.id,
        userEmail: currentAdmin.email,
        action: AuditAction.USER_UPDATED,
        details: `Administrador actualizó estado del usuario ${updated.email}: isActive=${updated.isActive}, isLocked=${updated.isLocked}.`,
      },
    }).catch(() => {});

    return this.mapToSummary(updated);
  }

  private mapToSummary(raw: any): UserSummary {
    return mapUserToSummary(raw);
  }
}


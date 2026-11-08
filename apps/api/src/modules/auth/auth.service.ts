import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { verifyPassword, hashPassword } from '../../common/utils/argon2.util';
import { LoginDto } from './dto/login.dto';
import { AuditAction, UserSummary, AuthLoginResponse } from '@bnb/shared';
import { randomBytes, createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { mapUserToSummary } from '../../common/utils/user-summary.util';
import { validateAvatarBuffer } from '../../common/utils/avatar-file.util';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    dto: LoginDto,
    metadata: { ipAddress?: string; userAgent?: string },
  ): Promise<{ response: AuthLoginResponse; token: string }> {
    const email = dto.email.trim().toLowerCase();
    const maxAttempts = this.configService.get<number>('MAX_FAILED_LOGIN_ATTEMPTS', 5);
    const lockoutMinutes = this.configService.get<number>('LOCKOUT_DURATION_MINUTES', 15);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await this.logAudit({
        userEmail: email,
        action: AuditAction.LOGIN_FAILED,
        details: 'Intento de inicio de sesión con correo inexistente.',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const now = new Date();

    // 1. Verificar bloqueo por intentos fallidos
    if (user.isLocked) {
      if (user.lockedUntil && now < user.lockedUntil) {
        const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
        await this.logAudit({
          userId: user.id,
          userEmail: user.email,
          action: AuditAction.LOGIN_FAILED,
          details: `Intento de acceso a cuenta bloqueada. Tiempo restante: ${remainingMinutes} min.`,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        });
        throw new UnauthorizedException(
          `La cuenta se encuentra bloqueada por seguridad debido a múltiples intentos fallidos. Intente nuevamente en ${remainingMinutes} minuto(s).`,
        );
      } else {
        // El tiempo de bloqueo ya expiró, desbloquear automáticamente
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            isLocked: false,
            failedAttempts: 0,
            lockedUntil: null,
          },
        });
        user.isLocked = false;
        user.failedAttempts = 0;
      }
    }

    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta de usuario se encuentra inactiva. Contacte a soporte.');
    }

    // 2. Verificar contraseña con Argon2id
    const isPasswordValid = await verifyPassword(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      const updatedAttempts = user.failedAttempts + 1;
      const shouldLock = updatedAttempts >= maxAttempts;
      const lockedUntil = shouldLock ? new Date(now.getTime() + lockoutMinutes * 60 * 1000) : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: updatedAttempts,
          isLocked: shouldLock,
          lockedUntil,
        },
      });

      if (shouldLock) {
        await this.logAudit({
          userId: user.id,
          userEmail: user.email,
          action: AuditAction.ACCOUNT_LOCKED,
          details: `Cuenta bloqueada temporalmente por ${lockoutMinutes} minutos tras alcanzar ${updatedAttempts} intentos fallidos.`,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        });
        throw new UnauthorizedException(
          `Cuenta bloqueada temporalmente por ${lockoutMinutes} minutos por superar el límite de intentos fallidos.`,
        );
      } else {
        const remainingAttempts = maxAttempts - updatedAttempts;
        await this.logAudit({
          userId: user.id,
          userEmail: user.email,
          action: AuditAction.LOGIN_FAILED,
          details: `Contraseña incorrecta. Intento ${updatedAttempts} de ${maxAttempts}.`,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        });
        throw new UnauthorizedException(
          `Credenciales inválidas. Le quedan ${remainingAttempts} intento(s) antes del bloqueo.`,
        );
      }
    }

    // 3. Login exitoso: restablecer contadores de seguridad
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        isLocked: false,
        lockedUntil: null,
        lastLoginAt: now,
      },
    });

    // 4. Crear sesión revocable en base de datos
    const sessionHours = this.configService.get<number>('SESSION_TTL_HOURS', 168); // 7 días
    const expiresAt = new Date(now.getTime() + sessionHours * 3600 * 1000);
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        ipAddress: metadata.ipAddress || null,
        userAgent: metadata.userAgent || null,
        deviceInfo: this.parseDeviceInfo(metadata.userAgent),
        expiresAt,
        isValid: true,
      },
    });

    // 5. Emitir JWT de acceso
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    };

    const accessToken = await this.jwtService.signAsync(jwtPayload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
    });

    const csrfToken = this.generateCsrfToken();

    await this.logAudit({
      userId: user.id,
      userEmail: user.email,
      action: AuditAction.LOGIN_SUCCESS,
      details: `Inicio de sesión exitoso con rol ${user.role}.`,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    const userSummary: UserSummary = {
      ...mapUserToSummary(user),
      failedAttempts: 0,
      lastLoginAt: now.toISOString(),
    };

    return {
      token: accessToken,
      response: {
        user: userSummary,
        csrfToken,
        expiresIn: sessionHours * 3600,
      },
    };
  }

  async logout(sessionId: string, userId: string, metadata: { ipAddress?: string; userAgent?: string }): Promise<void> {
    if (sessionId) {
      await this.prisma.session
        .update({
          where: { id: sessionId },
          data: { isValid: false },
        })
        .catch(() => {});
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    await this.logAudit({
      userId,
      userEmail: user?.email || 'desconocido',
      action: AuditAction.LOGOUT,
      details: 'Cierre de sesión seguro y revocación de sesión.',
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
  }

  async changePassword(userId: string, currentPass: string, newPass: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isValid = await verifyPassword(currentPass, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    const newHashed = await hashPassword(newPass);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHashed },
    });

    await this.logAudit({
      userId,
      userEmail: user.email,
      action: AuditAction.USER_UPDATED,
      details: 'El usuario actualizó su contraseña con éxito mediante Argon2id.',
    });
  }

  generateCsrfToken(): string {
    return randomBytes(32).toString('hex');
  }

  private getAvatarsDir(): string {
    const configured = this.configService.get<string>('STORAGE_AVATARS_PATH', '../../storage/avatars');
    return path.resolve(process.cwd(), configured);
  }

  private avatarDiskPath(userId: string, ext: string): string {
    return path.join(this.getAvatarsDir(), `${userId}.${ext}`);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserSummary> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName.trim(),
        jobTitle: dto.jobTitle?.trim() || null,
        area: dto.area.trim(),
      },
    });

    await this.logAudit({
      userId,
      userEmail: updated.email,
      action: AuditAction.USER_UPDATED,
      details: 'El usuario actualizó su perfil institucional (nombre, cargo o área).',
    });

    return mapUserToSummary(updated);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<UserSummary> {
    if (!file?.buffer) {
      throw new BadRequestException('No se recibió ningún archivo de imagen');
    }

    let meta: { mime: string; ext: string };
    try {
      meta = validateAvatarBuffer(file.buffer);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    const avatarsDir = this.getAvatarsDir();
    await fs.mkdir(avatarsDir, { recursive: true });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.removeAvatarFiles(userId);

    const relativePath = `avatars/${userId}.${meta.ext}`;
    const absolutePath = this.avatarDiskPath(userId, meta.ext);
    await fs.writeFile(absolutePath, file.buffer);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarPath: relativePath },
    });

    await this.logAudit({
      userId,
      userEmail: updated.email,
      action: AuditAction.USER_UPDATED,
      details: 'El usuario actualizó su foto de perfil.',
    });

    return mapUserToSummary(updated);
  }

  async deleteAvatar(userId: string): Promise<UserSummary> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.removeAvatarFiles(userId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarPath: null },
    });

    await this.logAudit({
      userId,
      userEmail: updated.email,
      action: AuditAction.USER_UPDATED,
      details: 'El usuario eliminó su foto de perfil.',
    });

    return mapUserToSummary(updated);
  }

  async getAvatarAbsolutePath(userId: string): Promise<{ filePath: string; mime: string } | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.avatarPath) {
      return null;
    }

    const ext = path.extname(user.avatarPath).replace('.', '') || 'jpg';
    const mime =
      ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    const absolute = path.join(this.getAvatarsDir(), `${userId}.${ext}`);
    try {
      await fs.access(absolute);
    } catch {
      return null;
    }

    return { filePath: absolute, mime };
  }

  private async removeAvatarFiles(userId: string): Promise<void> {
    for (const ext of ['jpg', 'png', 'webp']) {
      const filePath = this.avatarDiskPath(userId, ext);
      await fs.unlink(filePath).catch(() => {});
    }
  }

  private parseDeviceInfo(userAgent?: string): string {
    if (!userAgent) return 'Dispositivo desconocido';
    if (userAgent.includes('Mobile')) return 'Dispositivo Móvil';
    if (userAgent.includes('Macintosh')) return 'Mac OS Desktop';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Linux')) return 'Linux Desktop';
    return 'Navegador Web';
  }

  private async logAudit(data: {
    userId?: string;
    userEmail: string;
    action: AuditAction;
    details: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          userEmail: data.userEmail,
          action: data.action,
          details: data.details,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
        },
      });
    } catch (err) {
      this.logger.warn(`No se pudo registrar log de auditoría: ${(err as Error).message}`);
    }
  }
}

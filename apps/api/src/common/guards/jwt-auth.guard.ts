import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { mapUserToSummary } from '../utils/user-summary.util';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const cookieName = this.configService.get<string>('COOKIE_NAME', 'bnb_session');

    // 1. Obtener token desde cookie firmada o cabecera Authorization
    let token: string | undefined = request.signedCookies?.[cookieName] || request.cookies?.[cookieName];

    if (!token && request.headers.authorization) {
      const [type, headerToken] = request.headers.authorization.split(' ');
      if (type === 'Bearer' && headerToken) {
        token = headerToken;
      }
    }

    if (!token) {
      throw new UnauthorizedException('Sesión no encontrada o expirada. Por favor inicie sesión.');
    }

    try {
      const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
      const payload = await this.jwtService.verifyAsync(token, { secret });

      if (!payload || !payload.sub || !payload.sessionId) {
        throw new UnauthorizedException('Token de sesión inválido.');
      }

      // 2. Validar que la sesión no haya sido revocada en la BD
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
        include: { user: true },
      });

      if (!session || !session.isValid) {
        throw new UnauthorizedException('La sesión ha sido revocada o ha finalizado.');
      }

      if (new Date() > session.expiresAt) {
        throw new UnauthorizedException('La sesión ha expirado.');
      }

      const user = session.user;

      if (!user.isActive) {
        throw new UnauthorizedException('La cuenta de usuario está desactivada.');
      }

      if (user.isLocked) {
        if (user.lockedUntil && new Date() < user.lockedUntil) {
          throw new UnauthorizedException(
            `Cuenta temporalmente bloqueada por seguridad hasta ${user.lockedUntil.toISOString()}`,
          );
        }
      }

      // 3. Actualizar actividad de la sesión
      await this.prisma.session
        .update({
          where: { id: session.id },
          data: { lastActivityAt: new Date() },
        })
        .catch((err: any) => {
          this.logger.warn(`No se pudo actualizar lastActivityAt: ${err?.message || err}`);
        });

      request.user = mapUserToSummary(user);
      request.sessionId = session.id;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(`Fallo de autenticación: ${(error as Error).message}`);
      throw new UnauthorizedException('Credenciales o sesión inválida');
    }
  }
}

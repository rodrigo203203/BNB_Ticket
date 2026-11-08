import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // Métodos idempotentes y de solo lectura no requieren verificación CSRF
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Permitir explícitamente el endpoint de login si se usa antes de tener sesión
    if (request.path.includes('/auth/login') || request.path.includes('/auth/csrf')) {
      return true;
    }

    const headerToken = request.headers['x-csrf-token'] as string;
    const cookieToken = request.cookies?.['bnb_csrf_token'] || request.signedCookies?.['bnb_csrf_token'];

    if (!headerToken) {
      throw new ForbiddenException('Cabecera X-CSRF-Token requerida para operaciones de modificación.');
    }

    if (cookieToken && headerToken !== cookieToken) {
      throw new ForbiddenException('Token CSRF inválido o no coincidente.');
    }

    return true;
  }
}

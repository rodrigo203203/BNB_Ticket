import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl, ip } = request;
    const user = (request as any).user;
    const userEmail = user?.email || 'anónimo';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          this.logger.log(
            `[${method}] ${originalUrl} ${statusCode} +${duration}ms - Usuario: ${userEmail} - IP: ${ip}`,
          );
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          const status = err?.status || err?.statusCode || 500;
          this.logger.error(
            `[${method}] ${originalUrl} ${status} +${duration}ms - Usuario: ${userEmail} - IP: ${ip} - Fallo: ${err?.message}`,
          );
        },
      }),
    );
  }
}

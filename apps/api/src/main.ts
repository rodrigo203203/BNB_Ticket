import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  const cookieSecret = configService.get<string>('SESSION_COOKIE_SECRET', 'bnb_cookie_secret_long_32_chars');

  // 1. Seguridad con Helmet
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
    }),
  );

  // 2. Cookie parser con soporte para cookies firmadas
  app.use(cookieParser(cookieSecret));

  // 3. CORS seguro para SPA Vue con cookies y CSRF
  app.enableCors({
    origin: [corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'x-csrf-token',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['set-cookie'],
  });

  // 4. Prefijo global para la API
  app.setGlobalPrefix(apiPrefix);

  // 5. Validación estricta con DTOs y class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 6. Filtros e interceptores centralizados
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // 7. Documentación interactiva Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Plataforma BNB - Gestión de Solicitudes')
    .setDescription(
      'API RESTful bancaria de la Gerencia de Datos para gestión de solicitudes, autenticación con Argon2id, sesiones revocables y RBAC.',
    )
    .setVersion('1.0.0 (Fase 1)')
    .addBearerAuth()
    .addTag('Autenticación y Seguridad')
    .addTag('Gestión de Sesiones Revocables')
    .addTag('Solicitudes y Tickets (RBAC)')
    .addTag('Dashboard y Métricas por Rol')
    .addTag('Monitoreo del Sistema')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    customSiteTitle: 'BNB Datos - Swagger Docs',
  });

  await app.listen(port);
  logger.log(`🚀 Servidor backend escuchando en: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📄 Documentación Swagger disponible en: http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap();

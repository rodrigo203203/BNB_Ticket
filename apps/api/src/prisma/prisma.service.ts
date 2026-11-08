import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Conexión establecida exitosamente con PostgreSQL');
    } catch (error) {
      this.logger.warn(
        '⚠️ No se pudo conectar a la base de datos PostgreSQL local. ' +
        'El backend puede inicializarse para validación de contratos, tests con mocks o modo offline. ' +
        `Detalle: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Conexión con PostgreSQL cerrada.');
  }
}

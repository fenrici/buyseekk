import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Singleton PrismaClient por proceso NestJS.
 * Una instancia global; $connect en module init y $disconnect al apagar (enableShutdownHooks).
 * Pool: Prisma 6 usa connection pool interno; tamaño vía ?connection_limit= en DATABASE_URL si hace falta.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

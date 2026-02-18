import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      // Optimización de logs para depurar en Vercel si hay errores
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    // Es mejor dejar que Prisma conecte bajo demanda (lazy connect)
    // pero si decides mantenerlo, no bloquees el inicio si falla la DB
    try {
      await this.$connect();
    } catch (error) {
      console.error('Error inicializando conexión Prisma:', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
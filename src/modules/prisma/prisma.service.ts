import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // ⚠️ NO hagas await this.$connect(); aquí.
    // Deja que Prisma se conecte perezosamente (Lazy connect) en la primera query.
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 🕒 CRON JOB 1: Revisión de Suscripciones SaaS (Escuelas)
   * Se ejecuta todos los días a las 04:00 AM.
   * Busca escuelas cuya fecha de facturación ya pasó y no han renovado.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async checkExpiredSubscriptions() {
    this.logger.log('🔄 Iniciando revisión de suscripciones vencidas...');

    const now = new Date();

    // 1. Buscar escuelas activas con fecha de cobro vencida (damos 2 días de gracia)
    const gracePeriod = new Date();
    gracePeriod.setDate(now.getDate() - 2);

    const expiredSchools = await this.prisma.school.findMany({
      where: {
        subscriptionStatus: 'ACTIVE',
        nextBillingDate: { lt: gracePeriod },
        mode: 'COMMERCIAL', // Solo aplica a escuelas privadas
      },
    });

    // 2. Suspender escuelas morosas
    for (const school of expiredSchools) {
      await this.prisma.school.update({
        where: { id: school.id },
        data: { subscriptionStatus: 'SUSPENDED' },
      });

      this.logger.warn(
        `🚫 Escuela suspendida por no pago: ${school.name} (${school.id})`,
      );
      // TODO: Aquí deberías llamar a NotificationsService para enviar email al Director
    }

    this.logger.log(
      `✅ Revisión SaaS terminada. ${expiredSchools.length} escuelas suspendidas.`,
    );
  }

  /**
   * 🕒 CRON JOB 2: Control de Morosidad (Apoderados)
   * Se ejecuta todos los días a las 04:30 AM.
   * Marca como 'OVERDUE' las mensualidades vencidas ayer.
   */
  @Cron('0 30 4 * * *') // A las 04:30 AM
  async updateOverduePayments() {
    this.logger.log('🔄 Iniciando actualización de morosidad de alumnos...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. Actualizar estados en la base de datos
    const result = await this.prisma.monthlyFee.updateMany({
      where: {
        status: PaymentStatus.PENDING,
        dueDate: { lt: yesterday }, // Venció antes de ayer
      },
      data: {
        status: PaymentStatus.OVERDUE,
      },
    });

    if (result.count > 0) {
      this.logger.warn(
        `📉 Se marcaron ${result.count} mensualidades como VENCIDAS (Morosas).`,
      );

      // Opcional: Podrías buscar cuáles fueron para notificar
      /* const overdueFees = await this.prisma.monthlyFee.findMany({ 
          where: { status: 'OVERDUE', updatedAt: { gte: new Date() } } // Recién actualizados
      });
      // Enviar Push Notification a cada apoderado: "Tu mensualidad venció"
      */
    } else {
      this.logger.log('✅ No hay nuevas deudas vencidas hoy.');
    }
  }
}

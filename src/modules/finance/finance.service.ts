import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  FinanceSummary,
  PaymentMethod,
} from '../../entitys/monthly-fee.entity';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * KPI: Resumen Financiero del Mes
   * Calcula cuánto se ha recaudado, cuánto falta y la efectividad.
   */
  async getFinancialSummary(
    schoolId: string,
    month: number,
    year: number,
  ): Promise<FinanceSummary> {
    // Agrupación nativa de base de datos (Muy rápido gracias al index schoolId)
    const groups = await this.prisma.monthlyFee.groupBy({
      by: ['status'],
      where: {
        schoolId,
        month,
        year,
      },
      _sum: {
        amount: true,
      },
    });

    // Inicializar contadores
    let totalCollected = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    // Procesar resultados
    groups.forEach((g) => {
      const amount = g._sum.amount || 0;
      switch (g.status) {
        case PaymentStatus.PAID:
          totalCollected += amount;
          break;
        case PaymentStatus.PENDING:
          totalPending += amount;
          break;
        case PaymentStatus.OVERDUE:
          totalOverdue += amount;
          break;
        // WAIVED (Becados) no suma al total esperado financiero generalmente
      }
    });

    const expectedTotal = totalCollected + totalPending + totalOverdue;
    const collectionRate =
      expectedTotal > 0 ? (totalCollected / expectedTotal) * 100 : 0;

    return {
      totalCollected,
      totalPending,
      totalOverdue,
      expectedTotal,
      collectionRate: parseFloat(collectionRate.toFixed(1)), // Redondear a 1 decimal
    };
  }

  /**
   * Listar Mensualidades (Tabla de Gestión)
   * Permite filtrar por estado (ej: ver solo morosos)
   */
  async findAllFees(
    schoolId: string,
    month: number,
    year: number,
    status?: PaymentStatus,
  ) {
    return this.prisma.monthlyFee.findMany({
      where: {
        schoolId,
        month,
        year,
        ...(status ? { status } : {}),
      },
      include: {
        // Incluimos datos del jugador y su categoría para mostrar en la tabla
        player: {
          include: {
            category: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // Primero PENDING/OVERDUE para priorizar cobranza
        { player: { lastName: 'asc' } },
      ],
    });
  }

  /**
   * Marcar una mensualidad como PAGADA (Gestión Manual del Director)
   */
  async markAsPaid(
    feeId: string,
    paymentMethod: PaymentMethod,
    userSchoolId?: string,
  ) {
    // 1. Buscar la cuota
    const fee = await this.prisma.monthlyFee.findUnique({
      where: { id: feeId },
    });

    if (!fee) throw new NotFoundException('El cobro no existe');

    // 2. Seguridad: Verificar que pertenezca a la escuela del usuario (si se provee schoolId)
    // Esto evita que un Director pague la cuota de otra escuela por error/malicia
    if (userSchoolId && fee.schoolId !== userSchoolId) {
      throw new ForbiddenException(
        'No tienes permisos para gestionar pagos de esta escuela',
      );
    }

    if (fee.status === PaymentStatus.PAID) {
      throw new BadRequestException('Esta mensualidad ya está pagada');
    }

    // 3. Actualizar estado
    return this.prisma.monthlyFee.update({
      where: { id: feeId },
      data: {
        status: PaymentStatus.PAID,
        paymentDate: new Date(),
        paymentMethod: paymentMethod,
      },
      include: {
        player: true,
      },
    });
  }

  /**
   * Utilidad: Generar cobros masivos para un mes (Para ejecutar el día 1 del mes)
   * Nota: Esto usualmente se llama desde un Cron Job o un botón "Generar Periodo"
   */
  async generateFeesForMonth(
    schoolId: string,
    month: number,
    year: number,
    baseAmount: number,
  ) {
    // Obtener jugadores activos de la escuela
    const activePlayers = await this.prisma.player.findMany({
      where: { schoolId, active: true, scholarship: false }, // Excluir becados
    });

    const dueDate = new Date(year, month - 1, 5); // Vence el día 5 del mes

    const transactions = activePlayers.map((player) =>
      this.prisma.monthlyFee.create({
        data: {
          month,
          year,
          amount: baseAmount,
          dueDate,
          status: PaymentStatus.PENDING,
          schoolId,
          playerId: player.id,
        },
      }),
    );

    return this.prisma.$transaction(transactions);
  }
}

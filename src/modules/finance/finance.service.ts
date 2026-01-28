import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, Role } from '@prisma/client';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  /* ===========================================================================
   * CREAR CUOTA MENSUAL
   * =========================================================================== */

  async createMonthlyFee(
    playerId: string,
    amount: number,
    month: number,
    year: number,
    dueDate: Date,
    user: any,
  ) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) throw new NotFoundException('Jugador no encontrado');

    if (player.schoolId !== user.schoolId) {
      throw new ForbiddenException('Acceso denegado');
    }

    // Evitar cuotas duplicadas
    const existing = await this.prisma.monthlyFee.findFirst({
      where: { playerId, month, year },
    });

    if (existing) {
      throw new BadRequestException(
        'La cuota mensual ya existe para este periodo',
      );
    }

    return this.prisma.monthlyFee.create({
      data: {
        playerId,
        amount,
        month,
        year,
        dueDate,
        status: PaymentStatus.PENDING,
      },
    });
  }

  /* ===========================================================================
   * READ
   * =========================================================================== */

  async feesByPlayer(playerId: string, user: any) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) throw new NotFoundException('Jugador no encontrado');

    if (
      player.schoolId !== user.schoolId ||
      (user.role === Role.GUARDIAN && player.guardianId !== user.id)
    ) {
      throw new ForbiddenException('Acceso denegado');
    }

    return this.prisma.monthlyFee.findMany({
      where: { playerId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async feesBySchool(schoolId: string) {
    return this.prisma.monthlyFee.findMany({
      where: {
        player: { schoolId },
      },
      include: {
        player: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  /* ===========================================================================
   * UPDATE
   * =========================================================================== */

  async markAsPaid(feeId: string, receiptUrl: string | null, user: any) {
    const fee = await this.prisma.monthlyFee.findUnique({
      where: { id: feeId },
      include: { player: true },
    });

    if (!fee) throw new NotFoundException('Cuota no encontrada');

    if (fee.player.schoolId !== user.schoolId) {
      throw new ForbiddenException('Acceso denegado');
    }

    return this.prisma.monthlyFee.update({
      where: { id: feeId },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        receiptUrl,
      },
    });
  }

  async waiveFee(feeId: string, user: any) {
    const fee = await this.prisma.monthlyFee.findUnique({
      where: { id: feeId },
      include: { player: true },
    });

    if (!fee) throw new NotFoundException('Cuota no encontrada');

    if (fee.player.schoolId !== user.schoolId) {
      throw new ForbiddenException('Acceso denegado');
    }

    return this.prisma.monthlyFee.update({
      where: { id: feeId },
      data: {
        status: PaymentStatus.WAIVED,
      },
    });
  }
}

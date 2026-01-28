import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReferralStatus } from '@prisma/client';

@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService) {}

  // 1. Crear una invitación (El Director A invita al Director B)
  async createInvite(referrerSchoolId: string, inviteeEmail: string) {
    // Validar si ya existe una invitación pendiente para ese email
    const existingReferral = await this.prisma.referral.findFirst({
      where: {
        referredSchoolEmail: inviteeEmail,
        status: ReferralStatus.PENDING,
      },
    });

    if (existingReferral) {
      throw new BadRequestException(
        'Ya existe una invitación pendiente para este correo.',
      );
    }

    // Crear el registro de referido
    return this.prisma.referral.create({
      data: {
        referrerSchoolId,
        referredSchoolEmail: inviteeEmail,
        status: ReferralStatus.PENDING,
      },
    });
  }

  // 2. Reclamar referido (Cuando la Escuela B se registra y pone el código/email)
  async claimReferral(newSchoolId: string, inviteeEmail: string) {
    const referral = await this.prisma.referral.findFirst({
      where: {
        referredSchoolEmail: inviteeEmail,
        status: ReferralStatus.PENDING,
      },
    });

    if (!referral) {
      throw new NotFoundException(
        'No se encontró ninguna invitación válida para este correo.',
      );
    }

    // Actualizar el estado a CONVERTED y vincular la nueva escuela
    return this.prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: ReferralStatus.CONVERTED,
        referredSchoolId: newSchoolId,
        rewardClaimed: false, // Queda pendiente para que el sistema aplique el descuento
      },
    });
  }

  // 3. Aplicar recompensa (Lógica para dar el mes gratis al Director A)
  // Esto lo llamaría el FinanceService cuando procese los pagos
  async markRewardAsClaimed(referralId: string) {
    return this.prisma.referral.update({
      where: { id: referralId },
      data: { rewardClaimed: true },
    });
  }

  async findMyReferrals(schoolId: string) {
    return this.prisma.referral.findMany({
      where: { referrerSchoolId: schoolId },
      include: { referredSchool: true }, // Incluir datos de la escuela invitada
    });
  }
}

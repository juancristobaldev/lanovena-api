import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePlayerInput,
  UpdatePlayerInput,
} from 'src/entitys/player.entity';
import { Role } from '@prisma/client';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  /* ===================== MUTATIONS ===================== */

  async create(input: CreatePlayerInput, user: any) {
    if (!user.schoolId) {
      throw new ForbiddenException('Usuario sin escuela asociada');
    }

    return this.prisma.player.create({
      data: {
        ...input,
        schoolId: user.schoolId,
      },
    });
  }

  async update(playerId: string, input: UpdatePlayerInput, user: any) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) throw new NotFoundException('Jugador no encontrado');

    if (player.schoolId !== user.schoolId) {
      throw new ForbiddenException('Acceso denegado');
    }

    return this.prisma.player.update({
      where: { id: playerId },
      data: input,
    });
  }

  async toggleActive(playerId: string, user: any) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) throw new NotFoundException('Jugador no encontrado');

    if (player.schoolId !== user.schoolId) {
      throw new ForbiddenException('Acceso denegado');
    }

    return this.prisma.player.update({
      where: { id: playerId },
      data: { active: !player.active },
    });
  }

  /* ===================== QUERIES ===================== */

  async findByCategory(categoryId: string, schoolId: string) {
    return this.prisma.player.findMany({
      where: { categoryId, schoolId },
      orderBy: { lastName: 'asc' },
    });
  }

  async findByGuardian(guardianId: string, user: any) {
    if (user.role === Role.GUARDIAN && user.id !== guardianId) {
      throw new ForbiddenException('No autorizado');
    }

    return this.prisma.player.findMany({
      where: {
        guardianId,
        schoolId: user.schoolId,
      },
    });
  }

  async findBySchool(schoolId) {
    return this.prisma.player.findMany({
      where: {
        schoolId: schoolId,
      },
    });
  }

  async findProfile(playerId: string, user: any) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) throw new NotFoundException('Jugador no encontrado');

    if (player.schoolId !== user.schoolId) {
      throw new ForbiddenException('Acceso denegado');
    }

    if (user.role === Role.GUARDIAN && player.guardianId !== user.id) {
      throw new ForbiddenException('Acceso denegado');
    }

    return player;
  }

  async scanQr(qrCodeToken: string, schoolId: string) {
    const player = await this.prisma.player.findUnique({
      where: { qrCodeToken },
    });

    if (!player) throw new NotFoundException('QR inválido');

    if (player.schoolId !== schoolId) {
      throw new ForbiddenException('QR no pertenece a esta escuela');
    }

    return player;
  }
}

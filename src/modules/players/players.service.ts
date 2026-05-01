import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePlayerInput,
  UpdatePlayerInput,
} from '../../entitys/player.entity';
import { Role } from '@prisma/client';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeRut(rut?: string | null) {
    if (!rut) return null;
    const normalized = rut.replace(/\s+/g, '').toUpperCase();
    return normalized.length > 0 ? normalized : null;
  }

  /* ===================== MUTATIONS ===================== */

  async create(input: CreatePlayerInput, user: any) {
    const staff = await this.prisma.schoolStaff.findFirst({
      where: {
        userId: user.id,
        schoolId: input.schoolId,
      },
    });

    if (!staff) {
      throw new ForbiddenException('No te pertenece esta escuela');
    }

    const normalizedRut = this.normalizeRut(input.rut);
    if (normalizedRut) {
      const existing = await this.prisma.player.findFirst({
        where: {
          schoolId: input.schoolId,
          rut: normalizedRut,
        },
        select: { id: true },
      });

      if (existing) {
        throw new ConflictException('El RUT ya existe en esta escuela');
      }
    }

    return this.prisma.player.create({
      data: {
        ...input,
        rut: normalizedRut,
      },
    });
  }

  async update(playerId: string, input: UpdatePlayerInput, user: any) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });

    console.log({ player, user });
    if (!player) throw new NotFoundException('Jugador no encontrado');

    const staff = await this.prisma.schoolStaff.findFirst({
      where: {
        userId: user.id,
        schoolId: player?.schoolId || '',
      },
    });
    if (!staff && player.schoolId !== user.schoolId) {
      throw new ForbiddenException('Acceso denegado');
    }

    const normalizedRut = this.normalizeRut(input.rut as string | undefined);
    if (normalizedRut) {
      const existing = await this.prisma.player.findFirst({
        where: {
          schoolId: player.schoolId,
          rut: normalizedRut,
          id: { not: playerId },
        },
        select: { id: true },
      });

      if (existing) {
        throw new ConflictException('El RUT ya existe en esta escuela');
      }
    }

    return this.prisma.player.update({
      where: { id: playerId },
      data: {
        ...input,
        rut: input.rut === undefined ? undefined : normalizedRut,
      },
    });
  }

  async toggleActive(playerId: string, user: any) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) throw new NotFoundException('Jugador no encontrado');

    const staff = await this.prisma.schoolStaff.findFirst({
      where: {
        userId: user.id,
        schoolId: player?.schoolId || '',
      },
    });
    if (!staff) {
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
      include: {
        category: true,
        guardian: true,
        evaluations: true,
      },
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
      include: {
        category: true,
        guardian: true,
        evaluations: {
          include: {
            protocol: true,
          },
          orderBy: {
            date: 'desc',
          },
          take: 10,
        },
        attendance: {
          include: {
            session: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
        monthlyPayments: {
          orderBy: {
            dueDate: 'desc',
          },
          take: 6,
        },
      },
    });
  }

  async findProfile(playerId: string, user: any) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: {
        category: true,
        guardian: true,
        attendance: true,
        evaluations: {
          include: {
            protocol: true,
          },
        },
      },
    });

    if (!player) throw new NotFoundException('Jugador no encontrado');

    const staff = await this.prisma.schoolStaff.findFirst({
      where: {
        OR: [
          { userId: user.id, schoolId: player?.schoolId || '' },
          {
            school: {
              users: {
                some: {
                  id: user?.id,
                  role: Role.COACH,
                },
              },
            },
          },
        ],
      },
    });

    if (!staff) {
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

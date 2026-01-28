import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /* ===========================================================================
   * CREATE
   * =========================================================================== */

  async createUser(
    input: Prisma.UserCreateInput,
    actor: { role: Role; schoolId?: string },
  ): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    // Director solo puede crear usuarios en su escuela
    if (actor.role === Role.DIRECTOR) {
      input.school = { connect: { id: actor.schoolId! } };
    }

    return this.prisma.user.create({
      data: input,
    });
  }

  /* ===========================================================================
   * READ
   * =========================================================================== */

  async findAll(actor: { role: Role; schoolId?: string }) {
    if (actor.role === Role.SUPERADMIN) {
      return this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.user.findMany({
      where: { schoolId: actor.schoolId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(userId: string, actor: { role: Role; schoolId?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        school: true,
        schools: {
          include: {
            school: {
              include: {
                products: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (actor.role === Role.DIRECTOR && user.schoolId !== actor.schoolId) {
      throw new ForbiddenException('Acceso denegado');
    }

    return user;
  }

  async findCoaches(schoolId: string) {
    return this.prisma.user.findMany({
      where: {
        role: Role.COACH,
        schoolId,
      },
    });
  }

  async findGuardians(schoolId: string) {
    return this.prisma.user.findMany({
      where: {
        role: Role.GUARDIAN,
        schoolId,
      },
    });
  }

  /* ===========================================================================
   * UPDATE
   * =========================================================================== */

  async updateUser(
    userId: string,
    data: Prisma.UserUpdateInput,
    actor: { role: Role; schoolId?: string },
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!target) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (actor.role === Role.DIRECTOR && target.schoolId !== actor.schoolId) {
      throw new ForbiddenException('Acceso denegado');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /* ===========================================================================
   * DELETE / DEACTIVATE
   * =========================================================================== */

  async deactivateUser(userId: string): Promise<boolean> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return true;
  }
}

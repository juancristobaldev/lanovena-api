import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /* ===========================================================================
   * CREATE
   * =========================================================================== */

  async createUser(
    input: Prisma.UserCreateInput,
    actor: { id: string; role: Role; schoolId?: string },
  ): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (actor.role !== 'SUPERADMIN') {
      const schoolId = input.school?.connect?.id;

      const staffSchool = await this.prisma.schoolStaff.findFirst({
        where: {
          userId: actor.id,
          schoolId: schoolId,
        },
      });

      if (!staffSchool) throw new ForbiddenException('Acceso denegado');
    }

    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    // Director solo puede crear usuarios en su escuela

    const hashedPassword = await bcrypt.hash(input.password, 10);
    return this.prisma.user.create({
      data: { ...input, password: hashedPassword },
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
      include: {
        coachProfile: {
          include: {
            categories: true,
          },
        },
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
    actor: { id: string; role: Role; schoolId?: string },
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    console.log(target);
    if (!target?.schoolId) return null;

    const staff = await this.prisma.schoolStaff.findFirst({
      where: {
        userId: actor.id,
        schoolId: target?.schoolId,
      },
    });

    if (!target) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (actor.role === Role.DIRECTOR && !staff) {
      throw new ForbiddenException('Acceso denegado');
    }

    let hashedPassword: any = data.password;
    if (data.password) hashedPassword = await bcrypt.hash(hashedPassword, 10);

    return this.prisma.user.update({
      where: { id: userId },
      data: { ...data, password: hashedPassword },
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

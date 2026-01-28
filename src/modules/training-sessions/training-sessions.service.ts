import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TrainingSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  /* ===========================================================================
   * CREATE
   * =========================================================================== */

  async create(
    data: Prisma.TrainingSessionCreateInput,
    user: { schoolId: string },
  ) {
    return this.prisma.trainingSession.create({
      data: {
        ...data,
        category: data.category,
      },
    });
  }

  /* ===========================================================================
   * READ
   * =========================================================================== */

  async findByCategory(categoryId: string, schoolId: string) {
    return this.prisma.trainingSession.findMany({
      where: {
        categoryId,
        category: {
          schoolId,
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, schoolId: string) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Sesión de entrenamiento no encontrada');
    }

    if (session.category.schoolId !== schoolId) {
      throw new ForbiddenException('Acceso denegado');
    }

    return session;
  }

  /* ===========================================================================
   * UPDATE
   * =========================================================================== */

  async update(
    id: string,
    data: Prisma.TrainingSessionUpdateInput,
    schoolId: string,
  ) {
    await this.findOne(id, schoolId);

    return this.prisma.trainingSession.update({
      where: { id },
      data,
    });
  }

  /* ===========================================================================
   * DELETE
   * =========================================================================== */

  async remove(id: string, schoolId: string): Promise<boolean> {
    await this.findOne(id, schoolId);

    await this.prisma.trainingSession.delete({
      where: { id },
    });

    return true;
  }
}

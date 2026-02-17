import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta tu ruta de PrismaService
import {
  CreateStrategyInput,
  UpdateStrategyInput,
} from '../../entitys/strategy.entity';

@Injectable()
export class StrategyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createStrategyInput: CreateStrategyInput) {
    return this.prisma.strategy.create({
      data: {
        ...createStrategyInput,
        coach: {
          connect: { id: userId },
        },
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.strategy.findMany({
      where: { coachId: userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const strategy = await this.prisma.strategy.findFirst({
      where: { id, coachId: userId },
      include: { coach: true },
    });

    if (!strategy) {
      throw new NotFoundException(
        `Estrategia no encontrada o no tienes permisos`,
      );
    }

    return strategy;
  }

  async update(userId: string, updateStrategyInput: UpdateStrategyInput) {
    const { id, ...data } = updateStrategyInput;

    // Verificar existencia y propiedad antes de actualizar
    await this.findOne(id, userId);

    return this.prisma.strategy.update({
      where: { id },
      data: data,
    });
  }

  async remove(id: string, userId: string) {
    // Verificar existencia y propiedad antes de eliminar
    await this.findOne(id, userId);

    return this.prisma.strategy.delete({
      where: { id },
    });
  }
}

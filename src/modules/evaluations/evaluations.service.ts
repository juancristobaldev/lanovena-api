import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvaluationInput } from '../../entitys/evaluation.entity';

@Injectable()
export class EvaluationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEvaluationInput: CreateEvaluationInput) {
    return this.prisma.evaluation.create({
      data: {
        type: createEvaluationInput.type,
        value: createEvaluationInput.value,
        unit: createEvaluationInput.unit,
        player: {
          connect: { id: createEvaluationInput.playerId },
        },
        date: new Date(),
      },
      include: {
        player: true, // Devolvemos el jugador para actualizar la UI si es necesario
      },
    });
  }

  // Para ver el historial de un alumno (Gráficos de progreso)
  async findAllByPlayer(playerId: string) {
    return this.prisma.evaluation.findMany({
      where: { playerId },
      orderBy: { date: 'desc' },
      include: { player: true },
    });
  }
}

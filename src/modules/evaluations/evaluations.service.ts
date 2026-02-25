import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvaluationInput } from '../../entitys/evaluation.entity';

@Injectable()
export class EvaluationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateEvaluationInput) {
    return this.prisma.evaluation.create({
      data: {
        value: input.value,
        notes: input.notes,
        protocol: {
          connect: { id: input.protocolId }, // ✅ Conectamos con el TestProtocol
        },
        player: {
          connect: { id: input.playerId },
        },
        session: {
          connect: {
            id: input.sessionId,
          },
        },
      },
      include: {
        protocol: true, // ✅ Incluimos el protocolo para que GraphQL devuelva nombre y unidad
        player: true,
      },
    });
  }

  // Para ver el historial de un alumno (Gráficos de progreso y Radar)
  async findAllByPlayer(playerId: string) {
    return this.prisma.evaluation.findMany({
      where: { playerId },
      orderBy: { date: 'desc' },
      include: {
        protocol: true, // Crucial para los gráficos
        player: true,
      },
    });
  }
}

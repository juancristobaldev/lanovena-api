import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus, Prisma } from '@prisma/client';
import { CreateTrainingSessionInput } from '../../entitys/training-session.entity';

@Injectable()
export class TrainingSessionsService {
  constructor(private readonly prisma: PrismaService) {}
  async ratePlayer(
    sessionId: string,
    playerId: string,
    rating: number,
    notes?: string,
  ) {
    // Usamos upsert para asegurar que exista el registro de asistencia
    // O update si asumimos que ya se pasó lista.
    return this.prisma.attendance.upsert({
      where: {
        sessionId_playerId: {
          // Asumiendo que tienes esta clave compuesta única
          sessionId,
          playerId,
        },
      },
      update: {
        rating,
        feedback: notes,
      },
      create: {
        sessionId,
        playerId,
        status: 'PRESENT', // Asumimos presente si lo evalúan
        rating,
        feedback: notes,
      },
    });
  }

  async registerAttendance(
    sessionId: string,
    playerId: string,
    status: AttendanceStatus,
  ) {
    return this.prisma.attendance.upsert({
      where: {
        // Gracias al @@unique en el schema, Prisma genera este campo compuesto
        sessionId_playerId: {
          sessionId,
          playerId,
        },
      },
      // Si ya existe la asistencia, solo actualizamos el estado
      update: {
        status,
      },
      // Si NO existe, la creamos nueva
      create: {
        sessionId,
        playerId,
        status,
      },
      // Incluimos al jugador para que el frontend pueda actualizar la UI inmediatamente
      include: {
        player: true,
      },
    });
  }

  async markAsCompleted(sessionId: string, schoolId: string) {
    // 1. Verificar existencia y permisos (SchoolId)
    const session = await this.findOne(sessionId, schoolId);

    // 2. Actualizar estado
    return this.prisma.trainingSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED' },
    });
  }

  /* ===========================================================================
   * CREATE
   * =========================================================================== */

  async create(data: CreateTrainingSessionInput) {
    const newData: any = { ...data };

    delete newData.exerciseIds;
    delete newData.categoryId;
    delete newData.tacticalBoardIds;

    const tacticalBoards: any[] = data.tacticalBoardIds || [];

    return this.prisma.trainingSession.create({
      data: {
        ...newData,
        category: {
          connect: {
            id: data.categoryId,
          },
        },
        exercises: {
          createMany: {
            data:
              data.exerciseIds?.map((exerciseId, index) => ({
                exerciseId,
                orderIndex: index,
              })) || [],
          },
        },
        ...(tacticalBoards.length
          ? {
              tacticalBoards: {
                createMany: {
                  data: tacticalBoards.map((boardId, index) => ({
                    boardId,
                    orderIndex: index,
                  })),
                },
              },
            }
          : {}),
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
        category: {
          include: {
            players: true, // Necesario para mostrar la lista completa de alumnos
          },
        },
        exercises: {
          include: {
            exercise: true, // Detalles del ejercicio (nombre, foto)
          },
          orderBy: { orderIndex: 'asc' }, // Importante para el orden
        },
        attendance: {
          include: {
            player: true, // Para saber el nombre del alumno que asistió
          },
        },
        tacticalBoards: {
          include: {
            tacticalBoard: true,
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
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
